import { MapElement } from "./MapElement";

export type googleMapsBasicTypes = google.maps.Circle | google.maps.Polygon | google.maps.Polyline;

export type googleMapsShape = googleMapsBasicTypes | google.maps.marker.AdvancedMarkerElement;

export abstract class MVCObjectMapElement<T extends { id: string | number }> extends MapElement<T> {
    addEvent(eventName: string, callback: () => Promise<void>): void {
        this.events.set(eventName, this.toMapElement().addListener(eventName, callback));
    }

    abstract toMapElement(): googleMapsShape;
}
