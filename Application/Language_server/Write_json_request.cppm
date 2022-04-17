module;

#include <iostream>
#include <memory_resource>
#include <string_view>
#include <variant>
#include <vector>

export module h.language_server.write_json_request;

import h.language_server.request;

namespace h::language_server
{
    export template<typename Writer_type>
        void write_object(
            Writer_type& writer,
            Echo_request const& input
        );

    export template<typename Writer_type>
        void write_object(
            Writer_type& writer,
            Echo_answer const& input
        );

    export template<typename Writer_type>
        void write_object(
            Writer_type& writer,
            Create_html_template_data const& input
        );

    export template<typename Writer_type>
        void write_object(
            Writer_type& writer,
            Create_html_templates_request const& input
        );

    export template<typename Writer_type>
        void write_object(
            Writer_type& writer,
            Create_html_templates_answer const& input
        );

    export template<typename Writer_type>
        void write_object(
            Writer_type& writer,
            Request const& input
        );

    export template<typename Writer_type>
        void write_object(
            Writer_type& writer,
            Answer const& input
        );

    export template <typename Writer_type, typename Value_type>
        void write_object(
            Writer_type& writer,
            std::pmr::vector<Value_type> const& values
        )
    {
        writer.StartObject();

        writer.Key("size");
        writer.Uint64(values.size());

        writer.Key("elements");
        writer.StartArray();
        for (Value_type const& value : values)
        {
            if constexpr (std::is_unsigned_v<Value_type> && sizeof(Value_type) <= 4)
            {
                writer.Uint(value);
            }
            else if constexpr (std::is_unsigned_v<Value_type>)
            {
                writer.Uint64(value);
            }
            else if constexpr (std::is_signed_v<Value_type> && sizeof(Value_type) <= 4)
            {
                writer.Int(value);
            }
            else if constexpr (std::is_signed_v<Value_type>)
            {
                writer.Int64(value);
            }
            else if constexpr (std::is_floating_point_v<Value_type>)
            {
                writer.Double(value);
            }
            else if constexpr (std::is_same_v<Value_type, std::string> || std::is_same_v<Value_type, std::pmr::string> || std::is_same_v<Value_type, std::string_view>)
            {
                writer.String(value.data(), value.size());
            }
            else if constexpr (std::is_enum_v<Value_type>)
            {
                {
                    std::string_view const enum_value_string = write_enum(value);
                    writer.String(enum_value_string.data(), enum_value_string.size());
                }
            }
            else if constexpr (std::is_class_v<Value_type>)
            {
                write_object(writer, value);
            }
        }
        writer.EndArray(values.size());

        writer.EndObject();
    }

    export template<typename Writer_type>
        void write_object(
            Writer_type& writer,
            Echo_request const& output
        )
    {
        writer.StartObject();
        writer.Key("data");
        writer.String(output.data.data(), output.data.size());
        writer.EndObject();
    }

    export template<typename Writer_type>
        void write_object(
            Writer_type& writer,
            Echo_answer const& output
        )
    {
        writer.StartObject();
        writer.Key("data");
        writer.String(output.data.data(), output.data.size());
        writer.EndObject();
    }

    export template<typename Writer_type>
        void write_object(
            Writer_type& writer,
            Create_html_template_data const& output
        )
    {
        writer.StartObject();
        writer.Key("name");
        writer.String(output.name.data(), output.name.size());
        writer.Key("format");
        writer.String(output.format.data(), output.format.size());
        writer.EndObject();
    }

    export template<typename Writer_type>
        void write_object(
            Writer_type& writer,
            Create_html_templates_request const& output
        )
    {
        writer.StartObject();
        writer.Key("templates_to_create");
        write_object(writer, output.templates_to_create);
        writer.EndObject();
    }

    export template<typename Writer_type>
        void write_object(
            Writer_type& writer,
            Create_html_templates_answer const& output
        )
    {
        writer.StartObject();
        writer.Key("templates");
        write_object(writer, output.templates);
        writer.EndObject();
    }

    export template<typename Writer_type>
        void write_object(
            Writer_type& writer,
            Request const& output
        )
    {
        writer.StartObject();
        writer.Key("id");
        writer.Uint64(output.id);
        if (std::holds_alternative<Create_html_templates_request>(output.data))
        {
            writer.Key("create_html_templates_request");
            Create_html_templates_request const& value = std::get<Create_html_templates_request>(output.data);
            write_object(writer, value);
        }
        else if (std::holds_alternative<Echo_request>(output.data))
        {
            writer.Key("echo_request");
            Echo_request const& value = std::get<Echo_request>(output.data);
            write_object(writer, value);
        }
        writer.EndObject();
    }

    export template<typename Writer_type>
        void write_object(
            Writer_type& writer,
            Answer const& output
        )
    {
        writer.StartObject();
        writer.Key("id");
        writer.Uint64(output.id);
        if (std::holds_alternative<Create_html_templates_answer>(output.data))
        {
            writer.Key("create_html_templates_answer");
            Create_html_templates_answer const& value = std::get<Create_html_templates_answer>(output.data);
            write_object(writer, value);
        }
        else if (std::holds_alternative<Echo_answer>(output.data))
        {
            writer.Key("echo_answer");
            Echo_answer const& value = std::get<Echo_answer>(output.data);
            write_object(writer, value);
        }
        writer.EndObject();
    }

}
