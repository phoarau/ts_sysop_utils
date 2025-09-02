import "jquery.fancytree/dist/skin-bootstrap-n/ui.fancytree.css";
import "jquery.fancytree";
import "jquery.fancytree/dist/modules/jquery.fancytree.glyph";
import "jquery.fancytree/dist/modules/jquery.fancytree.dnd5";
import "jquery.fancytree/dist/modules/jquery.fancytree.table";
import "jquery.fancytree/dist/modules/jquery.fancytree.filter";

type SelectTreeProps = {
    /**
     * Le nom de l'objet (ex: menu, module, ...)
     */
    item_name: string;
    tree_selector: string;
    tree_options: Fancytree.FancytreeOptions;
    input?: JQuery<HTMLElement>;
    auto_init?: boolean;
};

/**
 * Génère un arbre fancytree avec selection
 * La selection via fancytree se répercute dans un input (doit etre de type select)
 */
export class SelectTree {
    /**
     * Le nom de l'objet qu'on selectionne.
     *
     * Comment comprendre et utiliser cette propriété:
     * - Le serveur doit envoyer dans la fonction `arbo` un objet `data`.
     * - Cet objet `data` doit contenir une propriété `type` avec la même valeur que `item_name`.
     * - L'objet `data` doit aussi contenir une propriété `${item_name}_id` qui contient l'id de l'objet.
     */
    item_name: string;
    /** Le selecteur du tree $(tree_selector).fancytree */
    tree_selector: string;
    /** Les options du fancytree */
    tree_options: Fancytree.FancytreeOptions;

    /**
     * L'input de type select multiple dans lequel mettre les Ids sélectionnés
     *
     * Peut ne pas etre précisé pour les cas où les elements sont non selectable
     *
            // Ex : Rendre les elements du tree non selectable
            tree_options.beforeSelect(event) => {
                return event?.originalEvent?.type !== "click";
            };
     * */
    input?: JQuery<HTMLElement>;
    /** Si le fancytree s'initialise dans le constructeur */
    auto_init: boolean = true;
    /** L'arbre réel Fancytree */
    tree: Fancytree.Fancytree | undefined;

    constructor({ item_name, tree_selector, tree_options, input, auto_init = true }: SelectTreeProps) {
        this.item_name = item_name;
        this.input = input;
        this.tree_selector = tree_selector;
        this.tree_options = tree_options;
        this.auto_init = auto_init;
        if (auto_init) {
            this.init();
        }
    }

    /**
     * Initialise le fancytree et les évènements (on click, ...)
     */
    init(): Fancytree.Fancytree {
        $(this.tree_selector).fancytree({
            ...this.tree_options,
            select: (event, data) => {
                this.#updateInput();
                if (typeof this.tree_options.select === "function") {
                    this.tree_options.select(event, data);
                }
            },
        });

        this.tree = $.ui.fancytree.getTree(this.tree_selector);

        return this.tree;
    }

    /**
     * Remplace la selection actuelle par la nouvelle selection
     *
     * si null: vide la selection
     *
     * @param ids liste des ids a selectionner
     */
    selectTreeValues(ids: number[] | null): void {
        const selected_nodes = this.tree?.getSelectedNodes() ?? [];
        selected_nodes.forEach((selected_node) => {
            selected_node.setSelected(false);
        });

        if (ids) {
            const _item_name = this.item_name;
            const nodes =
                this.tree?.findAll(function (node) {
                    return ids.includes(node.data[`${_item_name}_id`]);
                }) ?? [];
            nodes.forEach((node) => {
                node.setSelected(true);
            });
        }
    }

    #updateInput(): void {
        const selected_menus =
            this.tree?.findAll((node) => {
                return node.isSelected() && node.data.type === this.item_name;
            }) ?? [];
        const menus_ids = selected_menus.map((node) => node.data[`${this.item_name}_id`]);
        this.input?.val(menus_ids);
    }
}
