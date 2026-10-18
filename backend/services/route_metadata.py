"""
Route metadata generator — derives source, destination, and stop information
from route IDs using deterministic mapping based on Bangalore transit zones.
Since the dataset contains no actual stop names, these are realistic proxies
derived from route ID patterns.
"""

import hashlib

# Bangalore area names grouped by zone
NORTH = ["Yelahanka", "Hebbal", "Devanahalli", "Jakkur", "Thanisandra",
         "Kogilu", "Vidyaranyapura", "Bhattarahalli", "Nagawara", "Hennur"]

SOUTH = ["Banashankari", "Jayanagar", "JP Nagar", "Kumaraswamy Layout",
         "Gottigere", "Arekere", "Hulimavu", "Begur", "Singasandra", "Harlur"]

EAST  = ["Whitefield", "Marathahalli", "Domlur", "Indiranagar", "KR Puram",
         "Varthur", "Brookefield", "Mahadevapura", "Kadugodi", "Hoodi"]

WEST  = ["Rajajinagar", "Yeshwanthpur", "Peenya", "Tumkur Road", "Vijayanagar",
         "Magadi Road", "Nagarbhavi", "Kengeri", "Uttarahalli", "Nayandahalli"]

CENTRAL = ["Majestic", "MG Road", "Shivajinagar", "KR Market", "Jayanagar 4th Block",
           "Richmond Circle", "Lalbagh", "Cubbon Park", "Trinity", "Vasanth Nagar"]

INTERMEDIATE = [
    "Town Hall", "Hudson Circle", "Nimhans", "Dairy Circle",
    "Silk Board", "HSR Layout", "Koramangala", "BTM Layout",
    "Electronic City", "Hosur Road", "Old Airport Road",
    "HAL", "Ulsoor", "Commercial Street", "Brigade Road",
    "Residency Road", "Cunningham Road", "Palace Road",
    "Sadashivanagar", "Dollars Colony", "RT Nagar",
    "MS Ramaiah", "Mathikere", "Jalahalli", "BEL Circle"
]

ALL_ZONES = NORTH + SOUTH + EAST + WEST + CENTRAL


def _pick(lst, seed):
    """Pick a deterministic item from a list using a seed."""
    return lst[seed % len(lst)]


def get_route_info(route_id: int) -> dict:
    """
    Returns deterministic source, destination, and intermediate stops
    for a given route_id.
    """
    # Use route_id as seed for deterministic but varied results
    r = abs(route_id)
    
    # Pick source zone group
    zone_idx = r % 5
    zones = [NORTH, SOUTH, EAST, WEST, CENTRAL]
    source_zone = zones[zone_idx]
    dest_zone   = zones[(zone_idx + 2) % 5]   # opposite zone for long routes
    
    source = _pick(source_zone, r // 5)
    dest   = _pick(dest_zone,   r // 3)
    
    # Number of stops: 2 to 6 based on route_id
    num_stops = 2 + (r % 5)
    
    stops = []
    for i in range(num_stops):
        stop_name = _pick(INTERMEDIATE, (r + i * 7) % len(INTERMEDIATE))
        stops.append({
            "name": stop_name,
            "stop_number": i + 1,
            "avg_stop_time_mins": round(1.5 + (r + i) % 4, 1)
        })
    
    return {
        "source": source,
        "destination": dest,
        "stops": stops
    }
