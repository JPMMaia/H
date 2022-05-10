import type { App } from "vue";

export interface User_templates {
    function_declaration: string
};

export function register_user_template_components(application: App, templates: User_templates): void {

    application.component("h_ut_function_declaration", {
        template: templates.function_declaration
    });

}

export function create_default_user_templates(): User_templates {
    return {
        function_declaration: `
        <span class="h_ut_function_declaration">
            <slot name="return_type"></slot> <slot name="name"></slot>(<slot name="parameters"></slot>)
        </span>
        `
    }
}
