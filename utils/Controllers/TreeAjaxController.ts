import { Modal } from "bootstrap";
import { AjaxController, AjaxControllerProps } from "./AjaxController";
import { BaseControllerProps } from "./BaseController";
import { getCsrfToken } from "../AuthUtils";
import "jquery.fancytree/dist/skin-bootstrap-n/ui.fancytree.css";
import "jquery.fancytree";
import "jquery.fancytree/dist/modules/jquery.fancytree.glyph";
import "jquery.fancytree/dist/modules/jquery.fancytree.dnd5";
import "jquery.fancytree/dist/modules/jquery.fancytree.table";
import "jquery.fancytree/dist/modules/jquery.fancytree.filter";
import { showError, showSuccess } from "../commonUtils";

export type TreeAjaxProps = {
    treeId: string;
    tree?: Fancytree.Fancytree;
    modalId: string;
    renderColumns?: (event: JQueryEventObject, data: Fancytree.EventData) => void;
} & BaseControllerProps;

export abstract class TreeAjaxController<
    T extends { id: E },
    E = number | string | null | undefined,
> extends AjaxController<T, E> {
    treeId: string;
    tree?: Fancytree.Fancytree;
    modalId: string;
    modal: Modal;
    node: Fancytree.FancytreeNode | null = null;
    _node_move_start: Fancytree.FancytreeNode;
    _node_move_start_index: number;
    _node_move_end: Fancytree.FancytreeNode;
    _node_move_end_index: number;
    renderColumns?: (event: JQueryEventObject, data: Fancytree.EventData) => void;

    public CLIPBOARD: { mode: string; data: T } | null = null;

    constructor({ treeId, modalId, formId, url, renderColumns }: TreeAjaxProps & AjaxControllerProps) {
        super({ formId, url });
        this.treeId = treeId;
        this.modalId = modalId;
        this.modal = Modal.getOrCreateInstance(modalId);

        this.renderColumns = renderColumns;
        this.registerTree();
    }

    public new(node: Fancytree.FancytreeNode | null | undefined = null): void {
        this.baseNew();

        $(this.modalId).find(".btn-delete").hide();

        if (node) {
            this.node = node;
            this.node?.setExpanded(true);
        }

        this.modal.show();
    }

    async edit(id: E, node: Fancytree.FancytreeNode | null = null): Promise<T> {
        this.node = node;
        this.item = await this.baseEdit(id, {});
        $(this.modalId).find(".btn-delete").show();
        this.modal.show();
        return this.item;
    }

    async save() {
        const data = new FormData(this.form[0]);
        const validator = this.form.validate({});

        if (!validator.form()) {
            console.warn("Formulaire invalide");
            return;
        }
        const { status } = await this.baseSave(data, { action: "save", extension: "json" });

        if (status === 0) {
            this.modal.hide();

            await this.reloadNode(this.node);
        }
    }

    public async reloadNode(node: Fancytree.FancytreeNode | null): Promise<void> {
        if (node) {
            if (node.isLazy()) {
                node.resetLazy();
                await node.setExpanded(true, { noAnimation: true });
            } else {
                this.reloadParentNode(node);
            }
        } else {
            this.tree?.reload();
        }
    }

    public async reloadParentNode(node: Fancytree.FancytreeNode | null): Promise<void> {
        const parentNode = node?.getParent();
        if (parentNode && parentNode.isLazy()) {
            parentNode.resetLazy();
            await parentNode.setExpanded(true, { noAnimation: true });
        } else {
            this.tree?.reload();
        }
    }

    async delete(id?: E): Promise<boolean> {
        const res = await this.baseDelete(id ?? this.item?.id, {
            onConfirm: async () => {
                this.modal.hide();
            },
        });

        await this.reloadParentNode(this.node);

        return res;
    }

    public abstract get urlResource(): string;

    async paste(paste: T, node: Fancytree.FancytreeNode) {
        return $.ajax({
            url: `${this.urlResource}/paste.json`,
            type: "POST",
            data: { paste, node: this.getItemFromNode(node) },
            cache: false,
            headers: { "X-CSRF-Token": getCsrfToken() },
            dataType: "json",
            success: (e) => {
                if (e.status === 0) {
                    this.reloadNode(node);
                } else {
                    showError("Impossible de coller le noeud");
                    this.tree?.reload();
                }
            },
            error: (err) => {
                showError("Impossible de coller le noeud");
                console.error("ERROR", err);
                this.tree?.reload();
            },
        });
    }

    move(node_id: number, target_id: number, mode: string, offset: number) {
        $.ajax({
            url: `${this.urlResource}/move/${node_id}/${target_id}/${mode}/${offset}.json`,
            type: "GET",
            cache: false,
            headers: { "X-CSRF-Token": getCsrfToken() },
            dataType: "json",
            success: (e) => {
                if (e.status === 0) {
                    showSuccess("Le niveau a bien été déplacé");
                } else {
                    showError("Impossible de déplacer le niveau");
                    this.tree?.reload();
                }
            },
            error: (err) => {
                showError("Impossible de déplacer le niveau");
                console.error("ERROR", err);
                this.tree?.reload();
            },
        });
    }

    moveUp(node_id: number) {
        return $.ajax({
            url: `${this.urlResource}/up/${node_id}.json`,
            type: "GET",
            cache: false,
            headers: { "X-CSRF-Token": getCsrfToken() },
            dataType: "json",
            success: (e) => {
                if (e.status === 0) {
                    showSuccess("Le niveau a bien été déplacé");
                    this.reloadNode(this.node);
                } else {
                    showError("Impossible de déplacer le niveau");
                    this.tree?.reload();
                }
            },
            error: (err) => {
                showError("Impossible de déplacer le niveau");
                console.error(err);
                this.tree?.reload();
            },
        });
    }

    moveDown(node_id: number) {
        return $.ajax({
            url: `${this.urlResource}/down/${node_id}.json`,
            type: "GET",
            cache: false,
            headers: { "X-CSRF-Token": getCsrfToken() },
            dataType: "json",
            success: (e) => {
                if (e.status == 0) {
                    showSuccess("Le niveau a bien été déplacé");
                    this.reloadNode(this.node);
                } else {
                    showError("Impossible de déplacer le niveau");
                    this.tree?.reload();
                }
            },
            error: (err) => {
                showError("Impossible de déplacer le niveau");
                console.error(err);
                this.tree?.reload();
            },
        });
    }

    protected baseAttachEvents(): void | Promise<void> {
        if (this.modalId) {
            document.querySelector(this.modalId)?.addEventListener(
                "hide.bs.modal",
                () => {
                    this.baseDetachEvents();
                },
                { once: true },
            );
        }
        this.attachEvents();
    }

    protected baseDetachEvents(): void | Promise<void> {
        this.detachEvents();
    }

    /**
     * Par défaut cette fonction ajoute les événements sur les boutons `edit`, `save` et `delete` contenus dans les modales
     */
    protected attachEvents(): void | Promise<void> {
        if (this.modalId) {
            $(this.modalId)
                .find(".modal-footer")
                .find(".btn-edit")
                .on("click", () => {
                    if (this.item?.id) {
                        this.edit(this.item!.id!);
                    }
                });
            $(this.modalId)
                .find(".modal-footer")
                .find(".btn-save")
                .on("click", () => this.save());
            $(this.modalId)
                .find(".modal-footer")
                .find(".btn-delete")
                .on("click", () => {
                    if (this.item?.id) {
                        this.delete(this.item!.id!);
                    }
                });
        }
        // if (this.viewModalId) {
        //     $(this.viewModalId)
        //         .find(".btn-edit")
        //         .on("click", () => this.edit(this.item?.id!));
        //     $(this.viewModalId)
        //         .find(".btn-save")
        //         .on("click", () => this.save());
        //     $(this.viewModalId)
        //         .find(".btn-delete")
        //         .on("click", () => this.delete(this.item?.id!));
        // }
    }

    /**
     * Par défaut cette fonction retire les événements des boutons `edit`, `save` et `delete` contenus dans les modales
     */
    protected detachEvents(): void | Promise<void> {
        if (this.modalId) {
            $(this.modalId).find(".btn-edit").off("click");
            $(this.modalId).find(".btn-save").off("click");
            $(this.modalId).find(".btn-delete").off("click");
        }
        // if (this.viewModalId) {
        //     $(this.viewModalId).find(".btn-edit").off("click");
        //     $(this.viewModalId).find(".btn-save").off("click");
        //     $(this.viewModalId).find(".btn-delete").off("click");
        // }
    }

    protected abstract getFancytreeNodeFromItem(item?: T): Fancytree.NodeData;

    private registerTree(): void {
        $(this.treeId).fancytree({
            extensions: ["glyph", "dnd5", "table", "filter"],
            glyph: { preset: "awesome5" },
            filter: { counter: false, mode: "hide" },
            checkbox: false,
            selectMode: 1,
            table: { checkboxColumnIdx: 0, nodeColumnIdx: 0, indentation: 20 },
            dblclick: (_event, data) => {
                const item = this.getItemFromNode(data.node);
                if (item) {
                    this.edit(item.id, data.node);
                }
                return false;
            },
            click: (_event, data) => {
                this.node = data.node;
                return true;
            },
            renderColumns: this.renderColumns,
            dnd5: {
                preventRecursion: true, // Prevent dropping node on own descendants
                preventVoidMoves: true, // Prevent moving node 'before self', etc.
                preventNonNodes: true,
                preventForeignNodes: true,
                autoExpandMS: 250,
                dropEffectDefault: "auto", // "auto",
                dragStart: (sourceNode, data) => {
                    this._node_move_start = sourceNode;
                    this._node_move_start_index = this._node_move_start.getIndex();
                    data.effectAllowed = "all"; // or 'copyMove', 'link'', ...
                    data.dropEffect = data.dropEffectSuggested;
                    return true;
                },
                dragEnter(targetNode, data) {
                    data.dropEffect = "copy";
                    return true;
                },
                dragOver(_node, data) {
                    // Assume typical mapping for modifier keys
                    data.dropEffect = data.dropEffectSuggested;
                    // data.dropEffect = "move";
                },
                dragDrop: (node, data) => {
                    data.otherNode.moveTo(node, data.hitMode);
                    this._node_move_end = node;
                    this._node_move_end_index = this._node_move_end.getIndex();
                    let offset = 0;

                    if (this._node_move_end.parent != this._node_move_start.parent) {
                        offset =
                            this._node_move_end.getIndex() -
                            this._node_move_end.parent.children.length +
                            (data.hitMode == "after" ? 1 : 0);
                    } else {
                        switch (data.hitMode) {
                            case "after":
                                offset = this._node_move_start_index - this._node_move_end_index - 1;
                                break;
                            case "before":
                                offset = this._node_move_start_index - this._node_move_end_index + 1;
                                break;
                        }
                    }

                    const startItem = this.getItemFromNode(this._node_move_start);
                    const endItem = this.getItemFromNode(this._node_move_end);

                    if (startItem && endItem) {
                        this.move(Number(startItem.id), Number(endItem.id), data.hitMode, offset);
                        this._node_move_start.parent.setExpanded();
                    }
                    return true;
                },
            },
            source: { url: `${this.url}/children.json` },
            lazyLoad: (event, data) => {
                data.result = { url: `${this.url}/children/${this.getItemFromNode(data.node)?.id}.json` };
            },
        });

        this.tree = $.ui.fancytree.getTree(this.treeId);

        $(this.treeId).on("keydown", (e) => {
            let cmd: string | null = null;
            switch ($.ui.fancytree.keyEventToString(e as unknown as Event)) {
                case "ctrl+shift+n":
                case "meta+shift+n": // mac: cmd+shift+n
                    cmd = "addChild";
                    break;
                case "ctrl+c":
                case "meta+c": // mac
                    cmd = "copy";
                    break;
                case "ctrl+v":
                case "meta+v": // mac
                    cmd = "paste";
                    break;
                    // case "ctrl+x":
                    // case "meta+x": // mac
                    //     cmd = "cut";
                    break;
                case "ctrl+n":
                case "meta+n": // mac
                    cmd = "addSibling";
                    break;
                case "del":
                case "meta+backspace": // mac
                    cmd = "remove";
                    break;
                // case "f2":  // already triggered by ext-edit plugin
                //   cmd = "rename";
                //   break;
                case "ctrl+up":
                    cmd = "moveUp";
                    break;
                case "ctrl+down":
                    cmd = "moveDown";
                    break;
                // case "ctrl+right":
                // case "ctrl+shift+right": // mac
                //     cmd = "indent";
                //     break;
                // case "ctrl+left":
                // case "ctrl+shift+left": // mac
                //     cmd = "outdent";
            }
            if (cmd) {
                $(e.currentTarget).trigger("treeCommand", { cmd: cmd });
                e.preventDefault();
                e.stopPropagation();
                return false;
            }
        });

        $(this.treeId).on("treeCommand", (event, data) => {
            // Custom event handler that is triggered by keydown-handler and
            // context menu:
            let refNode: Fancytree.FancytreeNode;
            const tree = $(event.currentTarget).fancytree("getTree");
            const node: Fancytree.FancytreeNode = tree.getActiveNode();
            const item = this.getItemFromNode(node);

            switch (data.cmd) {
                case "moveUp":
                    refNode = node.getPrevSibling();
                    if (refNode && item?.id) {
                        node.moveTo(refNode, "before");
                        node.setActive();
                        this.moveUp(Number(item.id));
                    }
                    break;
                case "moveDown":
                    refNode = node.getNextSibling();
                    if (refNode && item?.id) {
                        node.moveTo(refNode, "after");
                        node.setActive();
                        this.moveDown(Number(item.id));
                    }
                    break;
                // case "indent":
                //     refNode = node.getPrevSibling();
                //     if (refNode) {
                //         node.moveTo(refNode, "child");
                //         refNode.setExpanded();
                //         node.setActive();
                //     }
                //     break;
                // case "outdent":
                //     if (!node.isTopLevel()) {
                //         node.moveTo(node.getParent(), "after");
                //         node.setActive();
                //     }
                //     break;
                case "rename":
                    node.editStart();
                    break;
                case "remove":
                    this.delete(item?.id);
                    break;
                case "addChild":
                    this.new(node);
                    break;
                case "addSibling":
                    node.editCreateNode("after", "");
                    break;
                    // case "cut":
                    //     this.CLIPBOARD = { mode: data.cmd, data: item! };
                    break;
                case "copy":
                    this.CLIPBOARD = { mode: data.cmd, data: item! };
                    break;
                case "clear":
                    this.CLIPBOARD = null;
                    break;
                case "paste":
                    if (this.CLIPBOARD?.mode === "copy") {
                        this.paste(this.CLIPBOARD.data, node);
                    }

                    break;
                default:
                    alert("Unhandled command: " + data.cmd);
                    return;
            }
        });
    }

    public getItemFromNode(node: Fancytree.FancytreeNode | null): T | null {
        return node?.data?.item ?? null;
    }
}
