import { FeatureCollection } from "geojson";
import { MapElement } from "./MapElement";

export abstract class GeoJsonElement<
    T extends { id: string | number; geojson: FeatureCollection },
> extends MapElement<T> {
    addEvent(/* eventName: string, callback: () => Promise<void>, map: google.maps.Map */): void {
        /* this.events.set(
            eventName,
            map.addListener(eventName, (event) => {
                if (this.isOfType(event)) {
                    callback();
                }
            }),
        ); */
    }
}
