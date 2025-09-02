import { MapElement } from "./MapElement";

/**
 * Classe abstraite représentant un contrôleur de carte google maps.
 *
 * Documentation de l'architecture disponible ici:
 * @link https://app.diagrams.net/#G1caH1qga9iQof_KHrroqegHUfe7W4JMfV#%7B%22pageId%22%3A%22C5RBs43oDa-KdzZeNtuy%22%7D
 * Cette documentation est à maintenir à jour.
 */
export abstract class MapController<T extends MapElement<E>, E extends { id: string | number }> {
    /** Map contenant les éléments de carte, indexés par leur identifiant */
    items: Map<string, T>;

    /**
     * Crée une instance de MapController.
     * @param map Promise résolvant vers l'objet google.maps.Map
     */
    constructor(public map: Promise<google.maps.Map>) {
        this.items = new Map<string, T>();
    }

    /** Redessine un élément spécifique sur la carte */
    abstract redraw(mapElement: T): Promise<void>;

    /** Efface tous les éléments de la carte */
    abstract clear(): void;

    /**
     * Ajoute des éléments à la carte
     * @param items Tableau d'éléments à ajouter
     */
    abstract add(items: T[]): Promise<void>;

    abstract itemToElement(item: E): T | null;

    /**
     * Supprime des éléments de la carte
     * @param itemIds Tableau d'identifiants des éléments à supprimer
     */
    abstract remove(itemIds: string[]): void;

    abstract resetMap(): Promise<void>;
    // async resetMap() {
    //     const map = await this.map;
    //     map.setZoom(getEnv().pare_center_zoom);
    //     map.setCenter({
    //         lat: getEnv().pare_center_lat,
    //         lng: getEnv().pare_center_lng,
    //     });
    // }
}
