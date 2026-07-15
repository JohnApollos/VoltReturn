import logging
import os
import numpy as np
import pandas as pd
from typing import Dict, List, Any, Tuple, Optional
from sklearn.cluster import KMeans
from sqlalchemy.orm import Session

from backend.app.core.config import settings
from backend.app.core.database import get_db
from backend.app.core.data_quality import DataQualityEngine
from backend.app.models.schemas import Recommendation

logger = logging.getLogger(__name__)

# --- CONSTANTS ---
EARTH_RADIUS_KM: float = 6371.0
NAIROBI_BOUNDS_LAT: Tuple[float, float] = (-1.45, -1.15)  # Expanded bounding box to cover Rongai/Kitengela
NAIROBI_BOUNDS_LON: Tuple[float, float] = (36.65, 37.05)
GRID_RESOLUTION: int = 40  # 40x40 grid points
MUNICIPAL_BOUNDARY_RADIUS_KM: float = 12.0 # Expanded radius to encompass Outskirts

# Anchor nodes for electricity grid stability checks
INDUSTRIAL_GRID_ANCHOR: Tuple[float, float] = (-1.3000, 36.8600)  # Makadara / Industrial Area
CBD_GRID_ANCHOR: Tuple[float, float] = (-1.2750, 36.8250)         # Starehe / CBD

# Major Road corridor coordinates for accessibility check
ROAD_CORRIDORS: List[Tuple[float, float]] = [
    (-1.222, 36.885),  # Thika Road
    (-1.300, 36.762),  # Ngong Road
    (-1.332, 36.875),  # Mombasa Road
    (-1.275, 36.895),  # Outer Ring Road
    (-1.285, 36.822),  # CBD Center
    (-1.305, 36.835)   # Lusaka Road corridor
]

# Multi-criteria scoring weights
WEIGHT_RIDER_POTENTIAL: float = 0.40
WEIGHT_CONNECTIVITY: float = 0.30
WEIGHT_GRID_STABILITY: float = 0.15
WEIGHT_ROAD_ACCESS: float = 0.15


def haversine_distance_vectorized(lat1: float, lon1: float, lats2: np.ndarray, lons2: np.ndarray) -> np.ndarray:
    """Calculates distances in km between a coordinate pair and a vector of coordinate pairs."""
    lat1_rad, lon1_rad = np.radians(lat1), np.radians(lon1)
    lats2_rad, lons2_rad = np.radians(lats2), np.radians(lons2)
    
    dlat = lats2_rad - lat1_rad
    dlon = lons2_rad - lon1_rad
    
    a = np.sin(dlat / 2.0)**2 + np.cos(lat1_rad) * np.cos(lats2_rad) * np.sin(dlon / 2.0)**2
    c = 2.0 * np.arcsin(np.sqrt(a))
    return EARTH_RADIUS_KM * c


class NetworkOptimizer:
    """Handles spatial analysis, coverage gap identification, and facility placement suggestions."""
    
    def __init__(self) -> None:
        self.subcounties: Optional[pd.DataFrame] = None
        self.existing_stations: Optional[pd.DataFrame] = None
        self.grid_points: Optional[pd.DataFrame] = None
        
    def load_data(
        self, 
        db: Session,
        subcounty_path: str = "data/nairobi_subcounties.csv", 
        stations_path: str = "data/existing_stations.csv"
    ) -> Dict[str, Any]:
        """Loads spatial datasets, runs Data Quality checks, and compiles search grids.
        
        Args:
            db (Session): Database session for logging data quality scores.
            subcounty_path (str): Relative subcounties path.
            stations_path (str): Relative swap stations path.
        """
        # Paths anchored from project root
        project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))))
        full_subcounty_path = os.path.join(project_root, subcounty_path)
        full_stations_path = os.path.join(project_root, stations_path)
        
        if not os.path.exists(full_subcounty_path) or not os.path.exists(full_stations_path):
            raise FileNotFoundError("Spatial configuration files are missing in the data directory.")
            
        self.subcounties = pd.read_csv(full_subcounty_path)
        self.existing_stations = pd.read_csv(full_stations_path)
        
        # 1. Run Data Quality Checks
        subcounty_rules = {
            "lat": (-2.0, 0.0),
            "lon": (35.0, 39.0),
            "population": (1000, 2000000),
            "density": (10, 100000)
        }
        station_rules = {
            "lat": (-2.0, 0.0),
            "lon": (35.0, 39.0),
            "cabinets": (1, 10),
            "grid_reliability": (0.0, 1.0)
        }
        
        sc_quality = DataQualityEngine.run_check(self.subcounties, "nairobi_subcounties", db, subcounty_rules)
        station_quality = DataQualityEngine.run_check(self.existing_stations, "existing_stations", db, station_rules)
        
        # 2. Compile spatial grids
        self._generate_search_grid()
        
        logger.info("Loaded subcounties quality: %s, stations quality: %s", sc_quality["usability_score"], station_quality["usability_score"])
        return {
            "subcounties_quality": sc_quality,
            "stations_quality": station_quality
        }
        
    def _generate_search_grid(self) -> None:
        """Compiles grid of candidate coordinates within municipal boundaries."""
        if self.subcounties is None:
            return
            
        lat_grid = np.linspace(NAIROBI_BOUNDS_LAT[0], NAIROBI_BOUNDS_LAT[1], GRID_RESOLUTION)
        lon_grid = np.linspace(NAIROBI_BOUNDS_LON[0], NAIROBI_BOUNDS_LON[1], GRID_RESOLUTION)
        
        points: List[Dict[str, Any]] = []
        
        for lat in lat_grid:
            for lon in lon_grid:
                # Find nearest subcounty centroid
                dists = [haversine_distance_vectorized(lat, lon, sc["lat"], sc["lon"]) for _, sc in self.subcounties.iterrows()]
                min_idx = int(np.argmin(dists))
                min_dist = float(dists[min_idx])
                
                # Exclude peripheral coordinates
                if min_dist <= MUNICIPAL_BOUNDARY_RADIUS_KM:
                    nearest_sc = self.subcounties.iloc[min_idx]
                    points.append({
                        "lat": lat,
                        "lon": lon,
                        "nearest_subcounty": str(nearest_sc["name"]),
                        "density": float(nearest_sc["density"]),
                        "boda_factor": float(nearest_sc["boda_factor"]),
                        "weight": float(nearest_sc["density"] * nearest_sc["boda_factor"])
                    })
                    
        self.grid_points = pd.DataFrame(points)
        logger.info("Generated network grid containing %d points.", len(self.grid_points))
        
    def find_coverage_gaps(self, threshold_km: float = 5.0) -> pd.DataFrame:
        """Identifies grid centroids that exceed the operational station coverage radius."""
        if self.grid_points is None or self.existing_stations is None:
            raise ValueError("Optimizer tables are uninitialized. Run load_data() first.")
            
        gap_points: List[Dict[str, Any]] = []
        for _, pt in self.grid_points.iterrows():
            dists = haversine_distance_vectorized(
                pt["lat"], pt["lon"],
                self.existing_stations["lat"].values,
                self.existing_stations["lon"].values
            )
            min_dist = float(np.min(dists))
            
            if min_dist > threshold_km:
                pt_dict = pt.to_dict()
                pt_dict["min_dist_to_existing"] = min_dist
                gap_points.append(pt_dict)
                
        return pd.DataFrame(gap_points)
        
    def recommend_stations(self, n_stations: int = 10, gap_threshold_km: float = 5.0) -> pd.DataFrame:
        """Determines best coordinates for expansion using K-Means placement optimization."""
        df_gaps = self.find_coverage_gaps(threshold_km=gap_threshold_km)
        
        if len(df_gaps) == 0:
            return pd.DataFrame()
            
        n_clusters = min(int(n_stations), len(df_gaps))
        X = df_gaps[["lat", "lon"]]
        weights = df_gaps["weight"]
        
        kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
        kmeans.fit(X, sample_weight=weights)
        
        centers = kmeans.cluster_centers_
        recommended_locations: List[Dict[str, Any]] = []
        
        for i, center in enumerate(centers):
            c_lat, c_lon = float(center[0]), float(center[1])
            
            # 1. Rider Potential Score (sum of densities decayed by distance)
            rider_pot = 0.0
            if self.subcounties is not None:
                for _, sc in self.subcounties.iterrows():
                    d = float(haversine_distance_vectorized(c_lat, c_lon, sc["lat"], sc["lon"]))
                    if d < 1.0:
                        d = 1.0  # Cap distance scale
                    if d <= 8.0:
                        rider_pot += (sc["density"] * sc["boda_factor"]) / d
            rider_score = min(100.0, (rider_pot / 50000.0) * 100.0)
            
            # 2. Grid Stability Score (distance to industrial/commercial feeders)
            dist_to_industrial = float(haversine_distance_vectorized(c_lat, c_lon, INDUSTRIAL_GRID_ANCHOR[0], INDUSTRIAL_GRID_ANCHOR[1]))
            dist_to_cbd = float(haversine_distance_vectorized(c_lat, c_lon, CBD_GRID_ANCHOR[0], CBD_GRID_ANCHOR[1]))
            closest_grid_dist = min(dist_to_industrial, dist_to_cbd)
            
            if closest_grid_dist <= 5.0:
                grid_stability = 0.95
            elif closest_grid_dist <= 10.0:
                grid_stability = 0.88
            else:
                grid_stability = 0.82
            grid_score = grid_stability * 100.0
            
            # 3. Network Connectivity Score (minimum distance to existing facilities)
            if self.existing_stations is not None:
                dists_existing = haversine_distance_vectorized(
                    c_lat, c_lon,
                    self.existing_stations["lat"].values,
                    self.existing_stations["lon"].values
                )
                min_existing_dist = float(np.min(dists_existing))
            else:
                min_existing_dist = 12.0
                
            if 3.0 <= min_existing_dist <= 8.0:
                connectivity_score = 100.0
            elif min_existing_dist < 3.0:
                connectivity_score = (min_existing_dist / 3.0) * 100.0
            else:
                connectivity_score = max(0.0, 100.0 - (min_existing_dist - 8.0) * 8.0)
                
            # 4. Road Proximity Score
            min_road_dist = min([float(haversine_distance_vectorized(c_lat, c_lon, clat, clon)) for clat, clon in ROAD_CORRIDORS])
            road_score = max(45.0, 100.0 - (min_road_dist * 10.0))
            
            # Weighted Decision Score
            overall_score = (
                (WEIGHT_RIDER_POTENTIAL * rider_score) + 
                (WEIGHT_CONNECTIVITY * connectivity_score) + 
                (WEIGHT_GRID_STABILITY * grid_score) + 
                (WEIGHT_ROAD_ACCESS * road_score)
            )
            
            # Associate nearest administrative subcounty name
            if self.subcounties is not None:
                sc_dists = [haversine_distance_vectorized(c_lat, c_lon, sc["lat"], sc["lon"]) for _, sc in self.subcounties.iterrows()]
                nearest_sc_name = str(self.subcounties.iloc[np.argmin(sc_dists)]["name"])
            else:
                nearest_sc_name = "Nairobi City"
                
            recommended_locations.append({
                "rec_id": f"REC-{i+1:02d}",
                "latitude": np.round(c_lat, 5),
                "longitude": np.round(c_lon, 5),
                "subcounty": nearest_sc_name,
                "rider_demand_score": np.round(rider_score, 1),
                "grid_stability_score": np.round(grid_score, 1),
                "connectivity_score": np.round(connectivity_score, 1),
                "road_access_score": np.round(road_score, 1),
                "overall_viability_score": np.round(overall_score, 1),
                "distance_to_existing_km": np.round(min_existing_dist, 2),
                "grid_stability_factor": grid_stability
            })
            
        df_rec = pd.DataFrame(recommended_locations)
        return df_rec.sort_values(by="overall_viability_score", ascending=False).reset_index(drop=True)
        
    def evaluate_expansion_impact(self, df_recs: pd.DataFrame) -> Dict[str, float]:
        """Calculates demographic metrics pre/post deployment."""
        if self.grid_points is None or self.existing_stations is None:
            raise ValueError("Optimizer tables are uninitialized. Run load_data() first.")
            
        if len(df_recs) == 0:
            new_lats = np.array([])
            new_lons = np.array([])
        else:
            new_lats = df_recs["latitude"].values
            new_lons = df_recs["longitude"].values
            
        all_lats = np.concatenate([self.existing_stations["lat"].values, new_lats])
        all_lons = np.concatenate([self.existing_stations["lon"].values, new_lons])
        
        coverage_before: List[int] = []
        coverage_after: List[int] = []
        dists_before: List[float] = []
        dists_after: List[float] = []
        
        for _, pt in self.grid_points.iterrows():
            # Before
            d_ex = haversine_distance_vectorized(pt["lat"], pt["lon"], self.existing_stations["lat"].values, self.existing_stations["lon"].values)
            min_d_ex = float(np.min(d_ex))
            dists_before.append(min_d_ex)
            coverage_before.append(1 if min_d_ex <= 5.0 else 0)
            
            # After
            d_all = haversine_distance_vectorized(pt["lat"], pt["lon"], all_lats, all_lons)
            min_d_all = float(np.min(d_all))
            dists_after.append(min_d_all)
            coverage_after.append(1 if min_d_all <= 5.0 else 0)
            
        total_weight = self.grid_points["weight"].sum()
        pct_covered_before = (np.array(coverage_before) * self.grid_points["weight"]).sum() / total_weight * 100.0
        pct_covered_after = (np.array(coverage_after) * self.grid_points["weight"]).sum() / total_weight * 100.0
        
        return {
            "pct_covered_before": float(np.round(pct_covered_before, 1)),
            "pct_covered_after": float(np.round(pct_covered_after, 1)),
            "avg_dist_before_km": float(np.round(np.mean(dists_before), 2)),
            "avg_dist_after_km": float(np.round(np.mean(dists_after), 2)),
            "max_dist_before_km": float(np.round(np.max(dists_before), 2)),
            "max_dist_after_km": float(np.round(np.max(dists_after), 2)),
            "coverage_improvement_pct": float(np.round(pct_covered_after - pct_covered_before, 1))
        }

    def calculate_brand_coverage(self, threshold_km: float = 5.0) -> Dict[str, float]:
        """Calculates population-weighted coverage percentages for each competitor network."""
        if self.grid_points is None or self.existing_stations is None:
            raise ValueError("Optimizer tables are uninitialized. Run load_data() first.")
            
        brands = self.existing_stations["brand"].unique()
        coverage_by_brand: Dict[str, float] = {}
        total_weight = self.grid_points["weight"].sum()
        
        for brand in brands:
            brand_stations = self.existing_stations[self.existing_stations["brand"] == brand]
            covered_flags: List[int] = []
            for _, pt in self.grid_points.iterrows():
                dists = haversine_distance_vectorized(pt["lat"], pt["lon"], brand_stations["lat"].values, brand_stations["lon"].values)
                min_dist = float(np.min(dists))
                covered_flags.append(1 if min_dist <= threshold_km else 0)
                
            coverage_pct = (np.array(covered_flags) * self.grid_points["weight"]).sum() / total_weight * 100.0
            coverage_by_brand[brand] = float(np.round(coverage_pct, 1))
            
        return coverage_by_brand

    def recalculate_rider_distances(self, df_recs: pd.DataFrame, riders_df: pd.DataFrame) -> np.ndarray:
        """Recalculates BSS distances for all riders post network expansion."""
        if self.existing_stations is None:
            raise ValueError("Existing stations not loaded. Run load_data() first.")
            
        if len(df_recs) == 0:
            return riders_df["Distance_to_BSS_km"].values
            
        new_lats = df_recs["latitude"].values
        new_lons = df_recs["longitude"].values
        
        all_lats = np.concatenate([self.existing_stations["lat"].values, new_lats])
        all_lons = np.concatenate([self.existing_stations["lon"].values, new_lons])
        
        new_distances: List[float] = []
        for _, rider in riders_df.iterrows():
            dists = haversine_distance_vectorized(rider["Latitude"], rider["Longitude"], all_lats, all_lons)
            new_distances.append(float(np.min(dists)))
            
        return np.round(new_distances, 2)
