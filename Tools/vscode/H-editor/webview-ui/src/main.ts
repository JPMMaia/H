import { applyMixins } from "@microsoft/fast-foundation";
import { createApp, ref } from "vue";
import App from "./App.vue";
import { create_default_user_templates, register_user_template_components, type User_templates } from "./User_templates";

const m_application = createApp(App);


const m_user_templates = ref<User_templates>(create_default_user_templates());
register_user_template_components(m_application, m_user_templates.value);

function on_message_received(event: MessageEvent): void {

    if ("message" in event.data) {
        const event_data = event.data;

        if (event_data.message === "user_template") {
            m_user_templates.value = event_data.data;
            register_user_template_components(m_application, m_user_templates.value);
        }
    }
}

window.addEventListener("message", on_message_received);

m_application.mount("#app");
