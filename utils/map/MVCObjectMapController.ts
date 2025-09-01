import { MapController } from "./MapController";
import { googleMapsBasicTypes, googleMapsShape, MVCObjectMapElement } from "./MVCObjectMapElement";

/**
 * TODO: documentation de la classe à réaliser (car elle fait partie d'un système important à maintenir)
 */
export abstract class MVCObjectMapController<
    T extends MVCObjectMapElement<E>,
    E extends { id: string | number },
> extends MapController<T, E> {
    elements: Map<string, googleMapsShape>;

    constructor(map: Promise<google.maps.Map>) {
        super(map);
        this.elements = new Map<string, googleMapsShape>();
    }

    async add(items: T[]): Promise<void> {
        const map = await this.map;
        // const elements = items.map((item) => item.toMapElement());
        for await (const item of items) {
            this.addOne(item, map);
            item.attachEvents(map);
        }
    }

    private addOne(item: T, map: google.maps.Map) {
        const element = item.toMapElement();
        if (!(item instanceof google.maps.marker.AdvancedMarkerElement)) {
            (element as googleMapsBasicTypes).setMap(map);
        } else {
            (element as google.maps.marker.AdvancedMarkerElement).map = map;
        }
        this.items.set(item.id, item);
        this.elements.set(item.id, element);
    }

    clear(): void {
        for (const [, mapElement] of this.items) {
            this.deleteOne(mapElement);
        }
    }

    private deleteOne(mapElement: T) {
        mapElement.detachEvents();
        const element = this.elements.get(mapElement.id);
        if (element instanceof google.maps.marker.AdvancedMarkerElement) {
            (element as google.maps.marker.AdvancedMarkerElement).map = null;
        } else {
            (element as googleMapsBasicTypes)?.setMap(null);
        }
        this.elements.delete(mapElement.id);
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
    }
}
