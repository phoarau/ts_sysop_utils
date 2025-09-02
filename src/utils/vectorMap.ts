// import { getEnvVar } from "./env";

// export function getSimpleCommunes(): { code: string; name: string }[] {
//     return getEnvVar("aster_map_geojson").features.map((feat) => ({
//         code: feat.properties.insee,
//         name: feat.properties.nom,
//     }));
// }

export const mercatorProjection = {
    project: (point) => [
        (point[0] / 180) * Math.PI,
        -Math.log(Math.tan((Math.PI / 2 + (point[1] / 180) * Math.PI) / 2)),
    ],
    unproject: (point) => [(point[0] * 180) / Math.PI, ((2 * 180) / Math.PI) * Math.atan(Math.exp(point[1])) - 90],
};
