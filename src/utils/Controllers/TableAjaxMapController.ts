import { TableAjaxController } from "./TableAjaxController";
import { MarkerClusterer } from "@googlemaps/markerclusterer";
import { Feature, GeoJsonObject } from "geojson";

export abstract class TableAjaxMapController<
    T extends { id: E },
    E = number | string | null | undefined,
> extends TableAjaxController<T, E> {
    mapId?: string;
    map?: Promise<google.maps.Map>;
    markers: google.maps.marker.AdvancedMarkerElement[] = [];
    geojsons: GeoJsonObject[] = [];
    features: google.maps.Data.Feature[] = [];

    async clearMap() {
        const map = await this.map;

        $.each(this.markers, (k, v) => {
            v.map = null;
        });
        this.markers = [];

        $.each(this.features, (k, v) => {
            map?.data.remove(v);
        });
        this.features = [];
    }

    async buildMarkers(datas: T[], icon: string) {
        const map = await this.map;

        this.markers = datas
            .filter((item) => {
                const hasLat = "lat" in item && Boolean(item.lat);
                const hasLng = "lng" in item && Boolean(item.lng);
                return hasLat && hasLng;
            })
            .map((item) => {
                const div = document.createElement("div");
                div.className = "text-center";
                const img = document.createElement("img");
                img.src = icon;
                div.append(img);
                const title = document.createElement("b");
                title.className = "bg-white p-2";
                title.textContent = this.getMarkerContentTitle(item);
                div.append(title);

                const marker = new google.maps.marker.AdvancedMarkerElement({
                    content: div,
                    title: this.getMarkerTitle(item),
                    //@ts-expect-error lat et lng pas définis dans le type de base mais filtrés juste avant
                    position: { lat: item.lat!, lng: item.lng! },
                });

                marker.addListener("click", () => {
                    const infoWindow = new google.maps.InfoWindow({
                        content: this.getMarkerInfoWindowContent(item),
                        ariaLabel: this.getMarkerInfoWindowAriaLabel(item),
                    });
                    infoWindow.open(map, marker);
                });
                return marker;
            });

        new MarkerClusterer({ markers: this.markers, map });
    }

    protected getMarkerTitle(item: T) {
        return "name" in item ? (item.name as string) : "-";
    }

    protected getMarkerContentTitle(item: T) {
        return "name" in item ? (item.name as string) : "-";
    }

    protected getMarkerInfoWindowContent(item: T) {
        return "code" in item && "name" in item ? `${item.code} - ${item.name}` : "-";
    }

    protected getMarkerInfoWindowAriaLabel(item: T) {
        return "name" in item ? (item.name as string) : "-";
    }

    async buildGeojsons(datas: (T & { geojson: Feature })[]) {
        const map = await this.map;

        this.features = datas.flatMap((item) => {
            const addedFeatures = map?.data.addGeoJson(item.geojson) ?? [];
            // if (addedFeatures) {
            //     this.features.push(...addedFeatures);
            // }
            return addedFeatures;
        });
        ///this.features.push(...addedFeatures);

        this.refreshStyles();
    }

    async zoom(item: T) {
        const itemHasLat = "lat" in item && typeof item.lat === "number";
        const itemHasLng = "lng" in item && typeof item.lng === "number";
        if (this.map && itemHasLat && itemHasLng) {
            (await this.map).moveCamera({
                center: {
                    lat: item.lat as number,
                    lng: item.lng as number,
                },
                zoom: 21,
            });
        }
    }

    async refreshStyles(): Promise<void> {
        const map = await this.map;

        map?.data.setStyle((feature) => {
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
