// import { Loader } from "@googlemaps/js-api-loader";
// import type { FeatureCollection, MultiLineString, Polygon } from "geojson";
// import { Env } from "./env";

// export function initMap(env: Env) {
//     return new Loader({
//         apiKey: env.getEnv().google_maps_api_key,
//         version: "weekly",
//         libraries: ["places", "core", "maps", "drawing", "marker", "geocoding"],
//     });
// }

// type GoogleMapOptions = {
//     origine?: {
//         center?: {
//             lat: number;
//             lng: number;
//         };
//         zoom?: number;
//     };
//     restriction?: {
//         latLngBounds: {
//             east: number;
//             north: number;
//             south: number;
//             west: number;
//         };
//         strictBounds: boolean;
//     };
// };

// const maps = new Map<string, google.maps.Map>();
// export async function getMap(mapId: string, options?: GoogleMapOptions): Promise<google.maps.Map> {
//     const existingMap = maps.get(mapId);
//     if (existingMap) {
//         return existingMap;
//     }

//     const { Map: GoogleMap } = await initMap().importLibrary("maps");

//     const mapElement = document.querySelector<HTMLElement>(mapId);
//     if (!mapElement) {
//         throw new Error("Élément de carte introuvable");
//     }

//     const center = options?.origine?.center ?? { lat: getEnv().pare_center_lat, lng: getEnv().pare_center_lng };
//     const gMap = new GoogleMap(mapElement, {
//         center,
//         zoom: options?.origine?.zoom ?? getEnv().pare_center_zoom,
//         disableDefaultUI: false,
//         gestureHandling: "greedy",
//         mapId: "1a756cf9871a5d0",
//     });

//     maps.set(mapId, gMap);

//     return gMap;
// }

// export function verticesToPoints(rawVertices: string) {
//     const points: google.maps.LatLngLiteral[] = [];
//     const vertices = rawVertices.split(",");

//     for (let j = 0; j < vertices.length / 2; j++) {
//         const point = {
//             lat: parseFloat(vertices[j * 2]),
//             lng: parseFloat(vertices[j * 2 + 1]),
//         };
//         points.push(point);
//     }

//     return points;
// }

// export function getBoundsOfPoints(points: google.maps.LatLngLiteral[]) {
//     const bounds = new google.maps.LatLngBounds();

//     for (const point of points) {
//         bounds.extend(point);
//     }

//     return bounds;
// }

// export function getBoundsOfGeojson(geojson: FeatureCollection<Polygon | MultiLineString>) {
//     return getBoundsOfPoints(getPointsOfPolygonGeojson(geojson));
// }

// export function getPointsOfPolygonGeojson(
//     geojson: FeatureCollection<Polygon | MultiLineString>,
// ): google.maps.LatLngLiteral[] {
//     return geojson.features
//         .map((feature) => feature.geometry.coordinates)
//         .flat(2)
//         .map((point) => ({ lat: point[1], lng: point[0] }));
// }

// export async function getAddressFromPosition(position: google.maps.LatLngLiteral): Promise<string> {
//     try {
//         const geocoder = new google.maps.Geocoder();
//         const { results } = await geocoder.geocode({ location: position, language: "fr" });
//         return results[0].formatted_address;
//     } catch (error) {
//         console.error(error);
//         return "-";
//     }
// }
