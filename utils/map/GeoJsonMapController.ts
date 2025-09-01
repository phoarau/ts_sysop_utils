import { FeatureCollection } from "geojson";
import { GeoJsonElement } from "./GeoJsonElement";
import { MapController } from "./MapController";

export abstract class GeoJsonMapController<
    T extends GeoJsonElement<E>,
    E extends { id: string | number; geojson: FeatureCollection },
> extends MapController<T, E> {
    features: Map<string, google.maps.Data.Feature[]>;

    constructor(map: Promise<google.maps.Map>) {
        super(map);
        this.features = new Map<string, google.maps.Data.Feature[]>();
        this.refreshStyles();
    }

    async add(items: T[]): Promise<void> {
        const map = await this.map;
        for (const item of items) {
            if (item != null) {
                this.addOne(item, map);
            }
        }
        this.refreshStyles();
    }

    private addOne(item: T, map: google.maps.Map) {
        const features = map.data.addGeoJson(item.item.geojson);

        features.forEach((feature) => {
            feature.setProperty("id", item.id);
        });

        this.items.set(item.id, item);
        this.features.set(item.id, features);
    }

    async clear(): Promise<void> {
        await Promise.all([...this.items.entries()].map(([, mapElement]) => this.deleteOne(mapElement)));
    }

    private async deleteOne(mapElement: T) {
        mapElement.detachEvents();
        const element = this.features.get(mapElement.id);

        if (!element) {
            throw new Error(`Impossible de supprimer les features de l'élément ${JSON.stringify(element)}`);
        }

        const map = await this.map;

        for (const feature of element) {
            map.data.remove(feature);
        }

        this.features.delete(mapElement.id);
        this.items.delete(mapElement.id);
    }

    remove(itemIds: string[]): void {
        for (const itemId of itemIds) {
            const item = this.items.get(itemId);
            if (!item) {
                console.warn(`Impossible de supprimer de la carte l'élément: ${JSON.stringify(item)}`);
                continue;
            }
            this.deleteOne(item);
        }
    }

    async redraw(mapElement: T): Promise<void> {
        this.deleteOne(mapElement);
        this.addOne(mapElement, await this.map);
        this.refreshStyles();
    }

    public async refreshStyles(): Promise<void> {
        (await this.map).data.setStyle((feature) => {
            const style = {
                strokeColor: "#000000",
                strokeOpacity: 1,
                strokeWeight: 1,
            };
            if (feature.getProperty("color")) {
                style.strokeColor = feature.getProperty("color") ? (feature.getProperty("color") as string) : "#0000FF";
                style.strokeOpacity = 2;
                style.strokeWeight = 3;
            }

            return style;
        });
    }
}
