import { BaseSearchModalController } from "./BaseSearchModalController";
import "jquery.fancytree";
import "jquery.fancytree/dist/modules/jquery.fancytree.glyph";
import "jquery.fancytree/dist/modules/jquery.fancytree.dnd5";
import "jquery.fancytree/dist/modules/jquery.fancytree.table";
import "jquery.fancytree/dist/modules/jquery.fancytree.filter";
import "jquery.fancytree/dist/skin-bootstrap-n/ui.fancytree.css";
import { sysopEndLoader, sysopStartLoader } from "../commonUtils";

type Props<T> = {
    treeId: string;
    modalId: string;
    nameTargetId: string;
    idTargetId: string;
    onSelect?: (item: T | null | undefined) => void | Promise<void>;
    url: string;
    getParentNiv?: () => string | number | null | undefined;
    getSelectedNiv?: () => string | number | null | undefined;
    beforeSelect?: (node: T | null | undefined) => boolean | Promise<boolean>;
    afterSelect?: (node: T | null | undefined) => void | Promise<void>;
};

export abstract class TreeSearchModalController<
    T extends { id?: number; name?: string; path?: string | { path?: string }; data?: { type: string } },
> extends BaseSearchModalController<T> {
    protected tree: Fancytree.Fancytree | null;
    protected url: string;
    typeId?: string;
    type?: JQuery<HTMLInputElement>;
    typeValue?: string;

    constructor(private props: Props<T>) {
        super({ ...props });
        this.url = this.props.url;
        this.tree = null;
    }

    getItemFromNode(node: Fancytree.FancytreeNode): T | null {
        return node.data?.item ?? null;
    }

    async reload() {
        sysopStartLoader();
        // Ici, ça fait un console.error, on ne comprend pas trop bien pourquoi
        await this.tree?.reload();
        sysopEndLoader();
    }

    protected async attachEvents() {
        $(this.props.treeId).fancytree({
            extensions: ["glyph"],
            glyph: { preset: "awesome5" },
            source: {
                url: `${this.url}/children.json`,
                data: {
                    parent_niv: this.props.getParentNiv?.(),
                    selected_niv: this.props.getSelectedNiv?.() ?? this.idTarget?.val(),
                    expanded: 0,
                },
                cache: false,
            },
            lazyLoad: (event, data) => {
                data.result = { url: `${this.url}/children.json`, data: { parent_niv: data.node.data.item_id } };
            },
            checkbox: false,
            autoActivate: false,
            unselectable: false,
            dblclick: (event, data) => {
                this.typeValue = data.node.data?.type ?? null;
                if (this.type) {
                    this.type.val(data.node.data?.type ?? "");
                }

                this.select(this.getItemFromNode(data.node));
                return true;
            },
        });

        this.tree = $.ui.fancytree.getTree(this.props.treeId);

        document.querySelector(this.modalId)?.addEventListener(
            "hide.bs.modal",
            () => {
                this.detachEvents();
            },
            { once: true },
        );

        $(this.modalId)
            .find(".btn-unselect")
            .on("click", () => {
                this.idTarget?.val("");
                this.nameTarget?.val("");
                this.type?.val("");
                this.typeValue = undefined;
                this.select(null);
                this.modal.hide();
            });
    }

    protected async detachEvents() {
        $(this.props.treeId).fancytree("destroy");
        this.tree = null;
        $(this.modalId).find(".btn-unselect").off("click");
    }
}
