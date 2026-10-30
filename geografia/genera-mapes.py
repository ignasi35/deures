#!/usr/bin/env python3
"""Generate static SVG maps and exercise data from the linked open datasets."""

import csv
import io
import json
import math
import re
import urllib.request
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
PROVINCES_URL = "https://raw.githubusercontent.com/codeforgermany/click_that_hood/main/public/data/spain-provinces.geojson"
COUNTRIES_MAP_URL = "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_0_countries.geojson"
COUNTRIES_DATA_URL = "https://raw.githubusercontent.com/mledoze/countries/master/countries.json"
CATALAN_NAMES_URL = "https://raw.githubusercontent.com/umpirsky/country-list/master/data/ca/country.csv"
CAPITALS_URL = "https://download.geonames.org/export/dump/countryInfo.txt"
VIEW_WIDTH = 1000
VIEW_HEIGHT = 720
PADDING = 18
PROVINCE_COLORS = [
    "#F4A098", "#64933D", "#FFD166", "#65ADE8", "#D5A6BD", "#8BC6A4",
    "#E5BC6B", "#9DADD6", "#F2C2A0", "#A9CFD3", "#C6B88A", "#C7A7D8",
    "#AECF91", "#EE9B9B", "#85B8D1", "#D8C6A0", "#B6ABC9",
]
PROVINCE_COMMUNITY_CODES = (
    "01", "02", "03", "04", "05", "06", "07", "08", "10",
    "11", "12", "13", "15", "16", "17", "18", "19",
)
PROVINCE_COMMUNITY_COLORS = dict(zip(PROVINCE_COMMUNITY_CODES, PROVINCE_COLORS))
CANARY_PROVINCE_CODES = {"35", "38"}
CONTINENT_COLORS = {
    "Africa": "#F4C9A8",
    "Asia": "#D8C6E8",
    "Europe": "#AFCFE5",
    "North America": "#C7DDAA",
    "South America": "#C7DDAA",
    "Oceania": "#F5DEA0",
    "Seven seas (open ocean)": "#D9D9D9",
}


def continent_for_country(feature, country_code=None):
    properties = feature["properties"]
    if (
        country_code == "CY"
        or properties.get("ISO_A2") == "CY"
        or properties.get("ADMIN") == "Northern Cyprus"
    ):
        return "Europe"
    return properties.get("CONTINENT")


COUNTRY_REGIONS = {
    "Europe": {
        "slug": "europa",
        "label": "Europa",
        "bounds": (-32, 32, 50, 82),
        "center_latitude": 55,
        "marker_positions": {
            "AD": (458, 573), "VA": (548, 578), "LI": (520, 510), "LU": (460, 478),
            "MT": (558, 666), "MC": (470, 555), "SM": (550, 540), "CY": (710, 678),
        },
    },
    "Americas": {
        "slug": "america",
        "label": "Amèrica",
        "bounds": (-175, -60, -28, 84),
        "center_latitude": 8,
        "inset": {
            "x": 18,
            "y": 302,
            "size": 400,
            "view_box": "525 270 240 190",
        },
        "inset_markers": {
            "AG": (722, 306), "BS": (615, 283), "BB": (725, 374), "BZ": (550, 334),
            "CO": (614, 432), "CR": (550, 392), "CU": (589, 306), "DM": (721, 329),
            "SV": (548, 365), "GD": (726, 407), "GT": (548, 311), "GY": (750, 390),
            "HT": (652, 297), "HN": (572, 318), "JM": (607, 337), "NI": (581, 362),
            "PA": (607, 410), "DO": (680, 315), "KN": (700, 280), "LC": (725, 350),
            "VC": (705, 386), "SR": (750, 435), "TT": (710, 420), "VE": (680, 400),
        },
        "marker_positions": {
            "AG": (722, 306), "BS": (615, 283), "BB": (725, 374), "BZ": (550, 334),
            "CO": (614, 432), "CR": (550, 392), "CU": (589, 306), "DM": (721, 329),
            "SV": (548, 365), "GD": (726, 407), "GT": (548, 311), "GY": (750, 390),
            "HT": (652, 297), "HN": (572, 318), "JM": (607, 337), "NI": (581, 362),
            "PA": (607, 410), "DO": (680, 315), "KN": (700, 280), "LC": (725, 350),
            "VC": (705, 386), "SR": (750, 435), "TT": (710, 420), "VE": (680, 400),
        },
    },
    "Africa": {
        "slug": "africa",
        "label": "Àfrica",
        "bounds": (-22, -38, 56, 38),
        "center_latitude": 0,
        "marker_positions": {
            "BI": (635, 405), "CV": (119, 240), "KM": (755, 478), "DJ": (746, 238),
            "SZ": (649, 610), "GW": (199, 261), "GM": (193, 231), "GQ": (442, 350),
            "LS": (622, 641), "MU": (883, 556), "RW": (637, 370), "SC": (866, 412),
            "ST": (392, 363), "TG": (375, 268),
        },
    },
    "Asia": {
        "slug": "asia",
        "label": "Àsia",
        "bounds": (24, -14, 182, 82),
        "center_latitude": 34,
        "view_box": "0 180 850 530",
        "map_alt": "Mapa d’Àsia ampliat, amb el nord de Rússia retallat aproximadament pel paral·lel 60° nord.",
        "marker_positions": {
            "AM": (140, 297), "AZ": (186, 297), "BH": (173, 433), "BD": (440, 447),
            "BT": (440, 395), "BN": (586, 582), "GE": (132, 285), "IL": (76, 388),
            "JO": (124, 400), "KW": (155, 378), "LB": (82, 349), "MV": (310, 590),
            "NP": (402, 412), "PS": (96, 409), "QA": (211, 438), "SG": (522, 605),
            "SY": (135, 338),
        },
    },
    "Oceania": {
        "slug": "oceania",
        "label": "Oceania",
        "bounds": (108, -52, 218, 24),
        "center_latitude": -20,
        "marker_positions": {
            "FJ": (645, 407), "MH": (590, 157), "SB": (488, 294), "FM": (440, 151),
            "NR": (552, 220), "PW": (240, 151), "WS": (728, 344), "TO": (706, 440),
            "TV": (658, 292), "VU": (552, 386),
        },
    },
}
CATALAN_COUNTRY_OVERRIDES = {
    "PS": "Palestina",
    "MK": "Macedònia del Nord",
}
CATALAN_CAPITAL_OVERRIDES = {
    "AM": "Erevan",
    "AT": "Viena",
    "AZ": "Bakú",
    "BA": "Sarajevo",
    "BD": "Dacca",
    "BE": "Brussel·les",
    "BG": "Sofia",
    "BO": "Sucre",
    "BY": "Minsk",
    "CD": "Kinshasa",
    "CG": "Brazzaville",
    "CH": "Berna",
    "CI": "Yamoussoukro",
    "CN": "Pequín",
    "CZ": "Praga",
    "DE": "Berlín",
    "DK": "Copenhaguen",
    "EG": "El Caire",
    "ES": "Madrid",
    "GE": "Tbilissi",
    "GR": "Atenes",
    "HR": "Zagreb",
    "HU": "Budapest",
    "ID": "Jakarta",
    "IL": "Jerusalem",
    "IN": "Nova Delhi",
    "IS": "Reykjavík",
    "JP": "Tòquio",
    "KG": "Bixkek",
    "KP": "Pyongyang",
    "KR": "Seül",
    "KZ": "Astana",
    "LB": "Beirut",
    "LT": "Vílnius",
    "LV": "Riga",
    "MA": "Rabat",
    "MD": "Chișinău",
    "MK": "Skopje",
    "MM": "Naypyidaw",
    "MX": "Ciutat de Mèxic",
    "NO": "Oslo",
    "OM": "Masqat",
    "PL": "Varsòvia",
    "PS": "Jerusalem Est",
    "RO": "Bucarest",
    "RU": "Moscou",
    "SA": "Riad",
    "SE": "Estocolm",
    "SY": "Damasc",
    "TH": "Bangkok",
    "TR": "Ankara",
    "UA": "Kíiv",
    "US": "Washington, D.C.",
    "UZ": "Taixkent",
    "VN": "Hanoi",
    "ZA": "Pretòria",
}
PROVINCES = {
    "01": ("Àlaba", "Vitòria-Gasteiz"),
    "02": ("Albacete", "Albacete"),
    "03": ("Alacant", "Alacant"),
    "04": ("Almeria", "Almeria"),
    "05": ("Àvila", "Àvila"),
    "06": ("Badajoz", "Badajoz"),
    "07": ("Illes Balears", "Palma"),
    "08": ("Barcelona", "Barcelona"),
    "09": ("Burgos", "Burgos"),
    "10": ("Càceres", "Càceres"),
    "11": ("Cadis", "Cadis"),
    "12": ("Castelló", "Castelló de la Plana"),
    "13": ("Ciudad Real", "Ciudad Real"),
    "14": ("Còrdova", "Còrdova"),
    "15": ("A Corunya", "A Corunya"),
    "16": ("Conca", "Conca"),
    "17": ("Girona", "Girona"),
    "18": ("Granada", "Granada"),
    "19": ("Guadalajara", "Guadalajara"),
    "20": ("Guipúscoa", "Donostia"),
    "21": ("Huelva", "Huelva"),
    "22": ("Osca", "Osca"),
    "23": ("Jaén", "Jaén"),
    "24": ("Lleó", "Lleó"),
    "25": ("Lleida", "Lleida"),
    "26": ("La Rioja", "Logronyo"),
    "27": ("Lugo", "Lugo"),
    "28": ("Madrid", "Madrid"),
    "29": ("Màlaga", "Màlaga"),
    "30": ("Múrcia", "Múrcia"),
    "31": ("Navarra", "Pamplona"),
    "32": ("Ourense", "Ourense"),
    "33": ("Astúries", "Oviedo"),
    "34": ("Palència", "Palència"),
    "35": ("Las Palmas", "Las Palmas de Gran Canària"),
    "36": ("Pontevedra", "Pontevedra"),
    "37": ("Salamanca", "Salamanca"),
    "38": ("Santa Cruz de Tenerife", "Santa Cruz de Tenerife"),
    "39": ("Cantàbria", "Santander"),
    "40": ("Segòvia", "Segòvia"),
    "41": ("Sevilla", "Sevilla"),
    "42": ("Sòria", "Sòria"),
    "43": ("Tarragona", "Tarragona"),
    "44": ("Terol", "Terol"),
    "45": ("Toledo", "Toledo"),
    "46": ("València", "València"),
    "47": ("Valladolid", "Valladolid"),
    "48": ("Biscaia", "Bilbao"),
    "49": ("Zamora", "Zamora"),
    "50": ("Saragossa", "Saragossa"),
}


def download(url):
    request = urllib.request.Request(url, headers={"User-Agent": "deures-geografia"})
    with urllib.request.urlopen(request, timeout=90) as response:
        return response.read().decode("utf-8")


def polygons(geometry):
    if geometry["type"] == "Polygon":
        yield geometry["coordinates"]
    elif geometry["type"] == "MultiPolygon":
        yield from geometry["coordinates"]


def unwrap_ring(ring, longitude_center):
    points = []
    previous = None
    for longitude, latitude, *_ in ring:
        longitude += 360 * round((longitude_center - longitude) / 360)
        if previous is not None:
            while longitude - previous > 180:
                longitude -= 360
            while longitude - previous < -180:
                longitude += 360
        points.append((longitude, latitude))
        previous = longitude
    return points


def clip_edge(points, inside, intersection):
    if not points:
        return []
    result = []
    previous = points[-1]
    previous_inside = inside(previous)
    for current in points:
        current_inside = inside(current)
        if current_inside:
            if not previous_inside:
                result.append(intersection(previous, current))
            result.append(current)
        elif previous_inside:
            result.append(intersection(previous, current))
        previous = current
        previous_inside = current_inside
    return result


def clip_ring(points, bounds):
    min_x, min_y, max_x, max_y = bounds

    def vertical(boundary):
        def cross(first, second):
            ratio = (boundary - first[0]) / (second[0] - first[0])
            return (boundary, first[1] + ratio * (second[1] - first[1]))
        return cross

    def horizontal(boundary):
        def cross(first, second):
            ratio = (boundary - first[1]) / (second[1] - first[1])
            return (first[0] + ratio * (second[0] - first[0]), boundary)
        return cross

    points = clip_edge(points, lambda point: point[0] >= min_x, vertical(min_x))
    points = clip_edge(points, lambda point: point[0] <= max_x, vertical(max_x))
    points = clip_edge(points, lambda point: point[1] >= min_y, horizontal(min_y))
    points = clip_edge(points, lambda point: point[1] <= max_y, horizontal(max_y))
    return points


def geometry_rings(geometry, bounds=None, longitude_center=0):
    for polygon in polygons(geometry):
        unwrapped = [unwrap_ring(ring, longitude_center) for ring in polygon]
        center = sum(point[0] for point in unwrapped[0]) / len(unwrapped[0])
        shifts = (-360, 0, 360) if bounds else (0,)
        for shift in shifts:
            shifted = [[(x + shift, y) for x, y in ring] for ring in unwrapped]
            if bounds:
                shifted = [clip_ring(ring, bounds) for ring in shifted]
            if shifted and len(shifted[0]) >= 3:
                yield shifted


def feature_coordinates(feature, bounds=None, longitude_center=0):
    for polygon in geometry_rings(feature["geometry"], bounds, longitude_center):
        for ring in polygon:
            yield from ring


def polygon_centroid(ring):
    area = 0
    x_sum = 0
    y_sum = 0
    for current, following in zip(ring, ring[1:] + ring[:1]):
        cross = current[0] * following[1] - following[0] * current[1]
        area += cross
        x_sum += (current[0] + following[0]) * cross
        y_sum += (current[1] + following[1]) * cross
    if abs(area) < 1e-10:
        return (
            sum(point[0] for point in ring) / len(ring),
            sum(point[1] for point in ring) / len(ring),
        )
    return x_sum / (3 * area), y_sum / (3 * area)


def transform(longitude, latitude, bounds, center_latitude, fitted_points=None, viewport=None):
    min_lon, min_lat, max_lon, max_lat = bounds
    longitude = longitude + 360 * round(((min_lon + max_lon) / 2 - longitude) / 360)
    scale_x = math.cos(math.radians(center_latitude))
    raw_x = longitude * scale_x
    x_min = min_lon * scale_x
    x_max = max_lon * scale_x
    x_min = min(x_min, max_lon * scale_x)
    x_max = max(x_max, min_lon * scale_x)
    if fitted_points:
        x_min = min(point[0] * scale_x for point in fitted_points)
        x_max = max(point[0] * scale_x for point in fitted_points)
        min_lat = min(point[1] for point in fitted_points)
        max_lat = max(point[1] for point in fitted_points)
    view_x, view_y, view_width, view_height = viewport or (
        PADDING,
        PADDING,
        VIEW_WIDTH - 2 * PADDING,
        VIEW_HEIGHT - 2 * PADDING,
    )
    scale = min(
        view_width / max(1e-9, x_max - x_min),
        view_height / max(1e-9, max_lat - min_lat),
    )
    width = (x_max - x_min) * scale
    height = (max_lat - min_lat) * scale
    offset_x = view_x + (view_width - width) / 2
    offset_y = view_y + (view_height - height) / 2
    return (
        offset_x + (raw_x - x_min) * scale,
        offset_y + (max_lat - latitude) * scale,
    )


def svg_map(features, bounds, center_latitude, colors, fitted=False, inset_codes=None, view_box=None):
    prepared = []
    all_points = []
    inset_points = []
    longitude_center = (bounds[0] + bounds[2]) / 2
    for feature in features:
        rings = list(geometry_rings(feature["geometry"], None if fitted else bounds, longitude_center))
        coordinates = [point for polygon in rings for ring in polygon for point in ring]
        if not coordinates:
            continue
        prepared.append((feature, rings))
        if inset_codes and feature["properties"].get("cod_prov") in inset_codes:
            inset_points.extend(coordinates)
        else:
            all_points.extend(coordinates)

    svg_view_box = view_box or f"0 0 {VIEW_WIDTH} {VIEW_HEIGHT}"
    output = [
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{svg_view_box}" role="img">',
        '<rect width="100%" height="100%" fill="#fff"/>',
    ]
    main_viewport = None
    inset_viewport = None
    if inset_codes:
        main_viewport = (190, 18, 792, 684)
        inset_viewport = (28, 548, 150, 135)
        output.extend([
            '<rect x="18" y="520" width="170" height="175" fill="#fff" stroke="#59656f" stroke-width="2"/>',
            '<text x="28" y="542" fill="#222" font-family="Arial, sans-serif" font-size="16">Illes Canàries</text>',
        ])
    for feature, polygons_rings in prepared:
        properties = feature["properties"]
        color = colors(feature)
        is_inset = bool(inset_codes and properties.get("cod_prov") in inset_codes)
        fitted_points = inset_points if is_inset else all_points
        viewport = inset_viewport if is_inset else main_viewport
        paths = []
        for polygon in polygons_rings:
            commands = []
            for ring in polygon:
                if len(ring) < 3:
                    continue
                points = [
                    transform(x, y, bounds, center_latitude, fitted_points if fitted else None, viewport)
                    for x, y in ring
                ]
                commands.append("M" + "L".join(f"{x:.1f} {y:.1f}" for x, y in points) + "Z")
            paths.extend(commands)
        if paths:
            title = json.dumps(properties.get("ADMIN", properties.get("name", "Territori")), ensure_ascii=False)[1:-1]
            output.append(
                f'<path d="{"".join(paths)}" fill="{color}" fill-rule="evenodd" '
                f'stroke="#59656f" stroke-width="1.1" stroke-linejoin="round"><title>{title}</title></path>'
            )
    output.append("</svg>")
    return "\n".join(output) + "\n"


def normalized_name(value):
    return re.sub(r"\s+", " ", value.strip()).casefold()


def download_world_data():
    map_data = json.loads(download(COUNTRIES_MAP_URL))
    source_countries = json.loads(download(COUNTRIES_DATA_URL))
    catalan_names = {
        row["id"]: row["value"]
        for row in csv.DictReader(io.StringIO(download(CATALAN_NAMES_URL)))
    }
    capital_rows = csv.reader(
        (line for line in download(CAPITALS_URL).splitlines() if not line.startswith("#")),
        delimiter="\t",
    )
    capitals = {row[0]: row[5] for row in capital_rows if len(row) > 8}
    country_data = [item for item in source_countries if item.get("independent") is True]
    if not any(item["cca2"] == "PS" for item in country_data):
        country_data.append({
            "cca2": "PS",
            "cca3": "PSE",
            "region": "Asia",
            "name": {"common": "Palestine"},
        })

    features_by_code = {}
    for feature in map_data["features"]:
        properties = feature["properties"]
        for key in ("ISO_A2", "ISO_A3", "ADM0_A3", "SOV_A3", "POSTAL"):
            code = properties.get(key)
            if code and code != "-99":
                features_by_code.setdefault(code, feature)
        features_by_code.setdefault(normalized_name(properties.get("ADMIN", "")), feature)
    by_country = {}
    for item in country_data:
        code = item["cca2"]
        feature = (
            features_by_code.get(item.get("cca3"))
            or features_by_code.get(code)
            or features_by_code.get("KOS" if code == "XK" else "")
            or features_by_code.get(normalized_name(item["name"]["common"]))
        )
        if feature is None:
            raise ValueError(f"No s'ha trobat la geometria del país {item['name']['common']}.")
        capital = capitals.get(code)
        if not capital:
            raise ValueError(f"No s'ha trobat la capital del país {item['name']['common']}.")
        name = CATALAN_COUNTRY_OVERRIDES.get(code, catalan_names.get(code, item["name"]["common"]))
        by_country[code] = {
            "code": code,
            "name": name,
            "capital": CATALAN_CAPITAL_OVERRIDES.get(code, capital),
            "region": item.get("region", "Americas"),
            "feature": feature,
        }
    return map_data["features"], by_country


def generate_countries():
    features, countries = download_world_data()
    region_entries = {}
    for region, spec in COUNTRY_REGIONS.items():
        bounds = spec["bounds"]
        center_latitude = spec["center_latitude"]
        entries = []
        for country in countries.values():
            if country["region"] != region:
                continue
            properties = country["feature"]["properties"]
            x = properties.get("LABEL_X")
            y = properties.get("LABEL_Y")
            if country["code"] == "RU" and region == "Europe":
                x, y = 38, 57
            if x is None or y is None:
                raise ValueError(f"No hi ha coordenades d'etiqueta per a {country['name']}.")
            if spec["slug"] == "america":
                country_continent = properties.get("CONTINENT")
                if country_continent not in ("North America", "South America"):
                    country_continent = "North America" if y > 8 else "South America"
                color = CONTINENT_COLORS[country_continent]
            else:
                continent = continent_for_country(country["feature"], country["code"])
                color = CONTINENT_COLORS.get(continent, "#D9D9D9")
            px, py = transform(x, y, bounds, center_latitude)
            entry = {
                "name": country["name"],
                "capital": country["capital"],
                "x": round(px, 1),
                "y": round(py, 1),
                "fill": color,
            }
            inset_marker = spec.get("inset_markers", {}).get(country["code"])
            if inset_marker:
                entry["insetMarker"] = {"x": inset_marker[0], "y": inset_marker[1]}
            marker_position = spec.get("marker_positions", {}).get(country["code"]) or inset_marker
            if marker_position:
                entry["markerPosition"] = {"x": marker_position[0], "y": marker_position[1]}
            entries.append(entry)
        if not entries:
            raise ValueError(f"No hi ha països per al continent {spec['label']}.")
        region_entries[region] = {
            "label": spec["label"],
            "entries": sorted(entries, key=lambda entry: normalized_name(entry["name"])),
        }
        slug_dir = ROOT / "paisos-mon" / spec["slug"]
        slug_dir.mkdir(parents=True, exist_ok=True)
        map_features = [
            feature for feature in features
            if any(feature_coordinates(feature, bounds, (bounds[0] + bounds[2]) / 2))
        ]
        map_svg = svg_map(
            map_features,
            bounds,
            center_latitude,
            lambda feature: CONTINENT_COLORS.get(continent_for_country(feature), "#D9D9D9"),
            view_box=spec.get("view_box"),
        )
        (slug_dir / "mapa.svg").write_text(map_svg)
        print(f"{spec['label']}: {len(entries)} països, {len(map_features)} formes")

    output = [
        "window.geographyWorld = {",
        "    viewBox: \"0 0 1000 720\",",
        "    markerRadius: 9,",
        "    markerFontSize: 9,",
    ]
    for region, spec in COUNTRY_REGIONS.items():
        info = region_entries[region]
        output.append(f"    {spec['slug']}: {{")
        output.append(f"        viewBox: {json.dumps(spec.get('view_box', '0 0 1000 720'))},")
        output.append("        itemLabel: \"país\",")
        output.append("        itemLabelPlural: \"països\",")
        output.append("        nameLabel: \"País\",")
        output.append("        letterInstructions: \"Identifica al mapa els {count} països marcats amb lletres i completa'n el nom i la capital.\",")
        map_alt = spec.get("map_alt", f"Mapa de {spec['label']} amb els països delimitats.")
        output.append(f"        mapAlt: {json.dumps(map_alt, ensure_ascii=False)},")
        if "inset" in spec:
            inset = spec["inset"]
            output.append(
                "        inset: { "
                f"x: {inset['x']}, y: {inset['y']}, size: {inset['size']}, "
                f"viewBox: {json.dumps(inset['view_box'])} "
                "},"
            )
        output.append("        markerRadius: 9,")
        output.append("        markerFontSize: 9,")
        output.append("        entries: [")
        for entry in info["entries"]:
            output.append("            " + json.dumps(entry, ensure_ascii=False, separators=(",", ":")) + ",")
        output.append("        ]")
        output.append("    },")
    output.extend(["};", ""])
    (ROOT / "geografia" / "paisos.js").write_text("\n".join(output))
    print(f"Dades generades per a {len(countries)} països.")


def generate_provinces():
    data = json.loads(download(PROVINCES_URL))
    features = [
        feature for feature in data["features"]
        if feature["properties"]["cod_prov"] in PROVINCES
    ]
    if len(features) != 50:
        raise ValueError(f"S'esperaven 50 províncies d'Espanya; s'han trobat {len(features)}.")

    points = [point for feature in features for point in feature_coordinates(feature)]
    main_points = [
        point for feature in features
        if feature["properties"]["cod_prov"] not in CANARY_PROVINCE_CODES
        for point in feature_coordinates(feature)
    ]
    canary_points = [
        point for feature in features
        if feature["properties"]["cod_prov"] in CANARY_PROVINCE_CODES
        for point in feature_coordinates(feature)
    ]
    bounds = (
        min(point[0] for point in points),
        min(point[1] for point in points),
        max(point[0] for point in points),
        max(point[1] for point in points),
    )
    center_latitude = 40
    entries = []
    for feature in features:
        code = feature["properties"]["cod_prov"]
        name, capital = PROVINCES[code]
        largest_ring = max(
            (polygon[0] for polygon in polygons(feature["geometry"])),
            key=lambda ring: abs(sum(
                first[0] * second[1] - second[0] * first[1]
                for first, second in zip(ring, ring[1:] + ring[:1])
            )),
        )
        longitude, latitude = polygon_centroid(largest_ring)
        is_canary = code in CANARY_PROVINCE_CODES
        x, y = transform(
            longitude,
            latitude,
            bounds,
            center_latitude,
            canary_points if is_canary else main_points,
            (28, 548, 150, 135) if is_canary else (190, 18, 792, 684),
        )
        color = PROVINCE_COMMUNITY_COLORS[feature["properties"]["cod_ccaa"]]
        entries.append({
            "name": name,
            "capital": capital,
            "x": round(x, 1),
            "y": round(y, 1),
            "fill": color,
        })
    entries.sort(key=lambda entry: normalized_name(entry["name"]))
    (ROOT / "provincies-espanya").mkdir(parents=True, exist_ok=True)
    (ROOT / "provincies-espanya" / "mapa.svg").write_text(
        svg_map(
            features,
            bounds,
            center_latitude,
            lambda feature: PROVINCE_COMMUNITY_COLORS[feature["properties"]["cod_ccaa"]],
            fitted=True,
            inset_codes=CANARY_PROVINCE_CODES,
        )
    )
    output = [
        "window.geographyExercise = {",
        "    itemLabel: \"província\",",
        "    itemLabelPlural: \"províncies\",",
        "    nameLabel: \"Província\",",
        "    letterInstructions: \"Identifica al mapa les {count} províncies marcades amb lletres i completa'n el nom i la capital.\",",
        "    mapAlt: \"Mapa d'Espanya amb les fronteres de les 50 províncies.\",",
        "    viewBox: \"0 0 1000 720\",",
        "    markerRadius: 11,",
        "    markerFontSize: 10,",
        "    entries: [",
    ]
    output.extend(
        "        " + json.dumps(entry, ensure_ascii=False, separators=(",", ":")) + ","
        for entry in entries
    )
    output.extend(["    ]", "};", ""])
    (ROOT / "provincies-espanya" / "provincies.js").write_text("\n".join(output))
    print(f"Províncies d'Espanya: {len(entries)}.")


def main():
    generate_provinces()
    generate_countries()


if __name__ == "__main__":
    main()
