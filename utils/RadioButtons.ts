type SelectingProps = { unselectable: true; unselectedValue?: string | number | string[] } | { unselectable?: false };

type GroupProps = {
    selector: string;
    values: Map<string, string>;
    baseStyleClasses?: string;
    additionalClasses?: string;
    selectedClass?: string;
    unselectedClass?: string;
    onSelect?: (selectedValue: string) => void | Promise<void>;
};

type ButtonProps = { baseButtonStyleClasses?: string; additionalButtonClasses?: string };

type Props = { inputSelector: string; group: GroupProps; button?: ButtonProps } & SelectingProps;

export class RadioButtons {
    public inputElement: JQuery<HTMLInputElement>;
    public groupElement: JQuery<HTMLElement>;

    // constantes
    private readonly GROUP_CLASS = "btn-radio-group";
    private readonly ELEMENT_CLASS = "btn-radio-element";
    private readonly VALUE_ATTRIBUTE = "btn-radio-element";
    private readonly DEFAULT_SELECTED_CLASS = "btn-primary";
    private readonly DEFAULT_UNSELECTED_CLASS = "btn-outline-primary";

    constructor(private props: Props) {
        this.inputElement = $(this.props.inputSelector);
        this.groupElement = $(this.props.group.selector);

        this.setupGroup();
        this.setValues();
        this.attachEvents();
        this.updateUI();
    }

    public get currentSelectedValue() {
        return this.inputElement.val();
    }

    private get selectedClass() {
        return this.props.group.selectedClass ?? this.DEFAULT_SELECTED_CLASS;
    }

    private get unselectedClass() {
        return this.props.group.unselectedClass ?? this.DEFAULT_UNSELECTED_CLASS;
    }

    private setupGroup() {
        this.groupElement.empty();
        this.groupElement.addClass(`${this.props.group.baseStyleClasses ?? "btn-group"} ${this.GROUP_CLASS}`);
        if (this.props.group.additionalClasses) {
            this.groupElement.addClass(this.props.group.additionalClasses);
        }
    }

    private setValues() {
        for (const [value, text] of this.props.group.values) {
            const button = $("<button>")
                .addClass(
                    `${this.props.button?.baseButtonStyleClasses ?? "btn"} ${this.props.button?.additionalButtonClasses ?? ""} ${this.ELEMENT_CLASS}`,
                )
                .attr(this.VALUE_ATTRIBUTE, value)
                .attr("type", "button")
                .text(text);
            this.groupElement.append(button);
        }
    }

    private attachEvents() {
        this.groupElement.on("click", `.${this.ELEMENT_CLASS}`, (event) => {
            const button = $(event.target as HTMLButtonElement);

            const newValue = button.attr(this.VALUE_ATTRIBUTE)!;
            const oldValue = this.inputElement.val();
            if (this.props.unselectable && newValue === oldValue) {
                this.inputElement.val(this.props.unselectedValue ?? "").trigger("change");
            } else {
                this.inputElement.val(newValue).trigger("change");
            }
        });

        this.inputElement.on("change", () => {
            this.updateUI();

            this.props.group.onSelect?.(this.inputElement.val() ?? "");
        });
    }

    private updateUI() {
        const buttons = this.groupElement.find(`button.${this.ELEMENT_CLASS}`).toArray();
        for (const button of buttons) {
            $(button).removeClass(this.selectedClass);
            $(button).addClass(this.unselectedClass);
        }
        const selectedButton = this.groupElement.find(
            `button.${this.ELEMENT_CLASS}[${this.VALUE_ATTRIBUTE}="${this.currentSelectedValue}"]`,
        );
        selectedButton.removeClass(this.unselectedClass);
        selectedButton.addClass(this.selectedClass);
    }
}
