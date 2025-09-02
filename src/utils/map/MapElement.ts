export abstract class MapElement<T extends { id: string | number }> {
    protected events: Map<string, google.maps.MapsEventListener>;

    constructor(
        public item: T,
        public prefix: string,
    ) {
        this.events = new Map<string, google.maps.MapsEventListener>();
    }

    public get id(): string {
        return `${this.prefix}-${this.item.id}`;
    }

    abstract attachEvents(map: google.maps.Map): Promise<void>;
    abstract addEvent(eventName: string, callback: () => Promise<void>, map: google.maps.Map): void;

    detachEvents() {
        // destructuration sans utiliser le 1er élément
        for (const [, event] of this.events) {
            event.remove();
        }
    }
}
