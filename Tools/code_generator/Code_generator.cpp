module;

#include <algorithm>
#include <cctype>
#include <format>
#include <istream>
#include <optional>
#include <ranges>
#include <span>
#include <sstream>
#include <string>
#include <unordered_map>
#include <unordered_set>

#include <rapidjson/document.h>
#include <rapidjson/stringbuffer.h>
#include <rapidjson/writer.h>

module h.tools.code_generator;

namespace h::tools::code_generator
{
    std::string indent(int const indentation)
    {
        return std::format("{:{}}", "", indentation);
    }

    std::pmr::string to_lowercase(std::string_view const string)
    {
        std::pmr::string lowercase_string;
        lowercase_string.resize(string.size());

        std::transform(
            string.begin(),
            string.end(),
            lowercase_string.begin(),
            [](char const c) { return std::tolower(c); }
        );

        return lowercase_string;
    }

    std::pmr::string generate_read_enum_json_code(
        Enum const enum_type,
        int const indentation
    )
    {
        std::stringstream output_stream;

        output_stream << indent(indentation) << "export template<>\n";
        output_stream << indent(indentation) << "    bool read_enum(" << enum_type.name << "& output, std::string_view const value)\n";
        output_stream << indent(indentation) << "{\n";

        if (!enum_type.values.empty())
        {
            std::string_view const value = enum_type.values[0];
            output_stream << indent(indentation) << "    if (value == \"" << value << "\")\n";
            output_stream << indent(indentation) << "    {\n";
            output_stream << indent(indentation) << "        output = " << enum_type.name << "::" << value << ";\n";
            output_stream << indent(indentation) << "        return true;\n";
            output_stream << indent(indentation) << "    }\n";
        }

        for (std::size_t index = 1; index < enum_type.values.size(); ++index)
        {
            std::string_view const value = enum_type.values[index];
            output_stream << indent(indentation) << "    else if (value == \"" << value << "\")\n";
            output_stream << indent(indentation) << "    {\n";
            output_stream << indent(indentation) << "        output = " << enum_type.name << "::" << value << ";\n";
            output_stream << indent(indentation) << "        return true;\n";
            output_stream << indent(indentation) << "    }\n";
        }
        output_stream << "\n";
        output_stream << indent(indentation) << "    std::cerr << std::format(\"Failed to read enum '" << enum_type.name << "' with value '{}'\\n\", value);\n";
        output_stream << indent(indentation) << "    return false;\n";
        output_stream << indent(indentation) << "}\n";

        return std::pmr::string{ output_stream.str() };
    }

    std::pmr::string generate_write_enum_json_code(
        Enum enum_type,
        int const indentation
    )
    {
        std::stringstream output_stream;

        output_stream << indent(indentation) << "export std::string_view write_enum(" << enum_type.name << " const value)\n";
        output_stream << indent(indentation) << "{\n";

        if (!enum_type.values.empty())
        {
            std::string_view const value = enum_type.values[0];
            output_stream << indent(indentation) << "    if (value == " << enum_type.name << "::" << value << ")\n";
            output_stream << indent(indentation) << "    {\n";
            output_stream << indent(indentation) << "        return \"" << value << "\";\n";
            output_stream << indent(indentation) << "    }\n";
        }

        for (std::size_t index = 1; index < enum_type.values.size(); ++index)
        {
            std::string_view const value = enum_type.values[index];
            output_stream << indent(indentation) << "    else if (value == " << enum_type.name << "::" << value << ")\n";
            output_stream << indent(indentation) << "    {\n";
            output_stream << indent(indentation) << "        return \"" << value << "\";\n";
            output_stream << indent(indentation) << "    }\n";
        }
        output_stream << "\n";
        output_stream << indent(indentation) << "    throw std::runtime_error{ \"Failed to write enum '" << enum_type.name << "'!\\n\" };\n";
        output_stream << indent(indentation) << "}\n";

        return std::pmr::string{ output_stream.str() };
    }

    namespace
    {
        bool is_enum_type(
            Type const& type,
            std::pmr::unordered_map<std::pmr::string, Enum> const& enum_types
        )
        {
            return enum_types.contains(type.name);
        }

        bool is_vector_type(
            Type const& type
        )
        {
            return type.name.starts_with("std::vector") || type.name.starts_with("std::pmr::vector");
        }

        bool is_optional_type(
            Type const& type
        )
        {
            return type.name.starts_with("std::optional");
        }

        bool is_struct_type(
            Type const& type,
            std::pmr::unordered_map<std::pmr::string, Struct> const& struct_types
        )
        {
            return struct_types.contains(type.name);
        }

        bool is_variant_type(
            Type const& type
        )
        {
            return type.name.starts_with("std::variant");
        }

        bool is_bool_type(
            Type const& type
        )
        {
            return type.name == "bool";
        }

        bool is_int_type(
            Type const& type
        )
        {
            return
                type.name == "std::int8_t" ||
                type.name == "std::int16_t" ||
                type.name == "std::int32_t" ||
                type.name == "int";
        }

        bool is_int64_type(
            Type const& type
        )
        {
            return type.name == "std::int64_t";
        }

        bool is_uint_type(
            Type const& type
        )
        {
            return
                type.name == "std::uint8_t" ||
                type.name == "std::uint16_t" ||
                type.name == "std::uint32_t" ||
                type.name == "unsigned";
        }

        bool is_uint64_type(
            Type const& type
        )
        {
            return
                type.name == "std::uint64_t" ||
                type.name == "std::size_t";
        }

        bool is_double_type(
            Type const& type
        )
        {
            return
                type.name == "float" ||
                type.name == "double";
        }

        bool is_string_type(
            Type const& type
        )
        {
            return
                type.name == "std::string" ||
                type.name == "std::pmr::string";
        }

        bool is_cpp_type(
            Type const& type
        )
        {
            return
                type.name.starts_with("std::") ||
                is_bool_type(type) ||
                is_int_type(type) ||
                is_uint_type(type) ||
                is_double_type(type);
        }

        std::pmr::string get_optional_value_type(
            Type const& type
        )
        {
            auto const open_location = type.name.find_first_of('<');
            auto const close_location = type.name.find_last_of('>');
            auto const count = close_location - open_location - 1;

            return std::pmr::string{ type.name.substr(open_location + 1, count) };
        }

        std::pmr::string get_vector_value_type(
            Type const& type
        )
        {
            auto const open_location = type.name.find_first_of('<');
            auto const close_location = type.name.find_last_of('>');
            auto const count = close_location - open_location - 1;

            return std::pmr::string{ type.name.substr(open_location + 1, count) };
        }

        std::pmr::vector<std::pmr::string> get_variadic_types(
            std::string_view const type
        )
        {
            auto const open_location = type.find_first_of('<');
            auto const close_location = type.find_last_of('>');

            std::string_view const types_string = { type.begin() + open_location + 1, type.begin() + close_location };

            std::pmr::vector<std::pmr::string> variadic_types;

            {
                auto start_location = types_string.begin();

                while (true)
                {
                    auto const comma_location = std::find(start_location, types_string.end(), ',');

                    std::string_view const type = { start_location, comma_location };
                    variadic_types.push_back(std::pmr::string{ type });

                    if (comma_location == types_string.end())
                    {
                        break;
                    }

                    start_location = comma_location + 1;
                }
            }

            return variadic_types;
        }

        std::pmr::string create_formatted_variant_type(
            std::span<std::pmr::string const> const types
        )
        {
            std::stringstream stream;

            stream << "std::variant<";

            for (std::size_t index = 0; index < types.size(); ++index)
            {
                if (index != 0)
                {
                    stream << ", ";
                }

                std::pmr::string const& type = types[index];
                stream << "h::" << type;
            }

            stream << ">";

            return std::pmr::string{ stream.str() };
        }

        int generate_read_struct_member_key_code(
            std::stringstream& output_stream,
            std::string_view const struct_name,
            Member const& member,
            int const state,
            std::pmr::unordered_map<std::pmr::string, Struct> const& struct_types,
            int const indentation,
            bool const indent_first
        )
        {
            if (is_variant_type(member.type))
            {
                if (indent_first)
                    output_stream << indent(indentation);
                output_stream << "if (event_data == \"" << member.name << "\")\n";
                output_stream << indent(indentation) << "{\n";
                output_stream << indent(indentation) << "    state = " << state << ";\n";
                output_stream << indent(indentation) << "    return true;\n";
                output_stream << indent(indentation) << "}\n";
                return 1;
            }
            else
            {
                if (indent_first)
                    output_stream << indent(indentation);
                output_stream << "if (event_data == \"" << member.name << "\")\n";
                output_stream << indent(indentation) << "{\n";
                output_stream << indent(indentation) << "    state = " << state << ";\n";
                output_stream << indent(indentation) << "    return true;\n";
                output_stream << indent(indentation) << "}\n";

                return ((is_struct_type(member.type, struct_types) || is_vector_type(member.type)) ? 2 : 1);
            }
        }

        void generate_read_object_code(
            std::stringstream& output_stream,
            std::string_view const output_name,
            int const state,
            int const end_state,
            int const stack_offset,
            int const indentation
        )
        {
            output_stream << indent(indentation) << "case " << state << ":\n";
            output_stream << indent(indentation) << "{\n";
            output_stream << indent(indentation) << "    state = " << (state + 1) << ";\n";
            output_stream << indent(indentation) << "    return read_object(" << output_name << ", event, event_data, state_stack, state_stack_position + 1 + " << stack_offset << ");\n";
            output_stream << indent(indentation) << "}\n";
            output_stream << indent(indentation) << "case " << (state + 1) << ":\n";
            output_stream << indent(indentation) << "{\n";
            output_stream << indent(indentation) << "    if ((event == Event::End_object) && (state_stack_position + 2 + " << stack_offset << " == state_stack.size()))\n";
            output_stream << indent(indentation) << "    {\n";
            output_stream << indent(indentation) << "        if (!read_object(" << output_name << ", event, event_data, state_stack, state_stack_position + 1 + " << stack_offset << "))\n";
            output_stream << indent(indentation) << "        {\n";
            output_stream << indent(indentation) << "            return false;\n";
            output_stream << indent(indentation) << "        }\n";
            output_stream << "\n";
            output_stream << indent(indentation) << "        state = " << end_state << ";\n";
            output_stream << indent(indentation) << "        return true;\n";
            output_stream << indent(indentation) << "    }\n";
            output_stream << indent(indentation) << "    else\n";
            output_stream << indent(indentation) << "    {\n";
            output_stream << indent(indentation) << "        return read_object(" << output_name << ", event, event_data, state_stack, state_stack_position + 1 + " << stack_offset << ");\n";
            output_stream << indent(indentation) << "    }\n";
            output_stream << indent(indentation) << "}\n";
        }

        int generate_read_struct_member_value_code(
            std::stringstream& output_stream,
            std::string_view const struct_name,
            Member const& member,
            int const state,
            std::pmr::unordered_map<std::pmr::string, Enum> const& enum_types,
            std::pmr::unordered_map<std::pmr::string, Struct> const& struct_types,
            int const indentation
        )
        {
            if (is_struct_type(member.type, struct_types) || is_vector_type(member.type))
            {
                std::pmr::string const output_name = "output." + member.name;

                generate_read_object_code(
                    output_stream,
                    output_name,
                    state,
                    1,
                    0,
                    indentation
                );

                return 2;
            }
            else if (is_enum_type(member.type, enum_types))
            {
                output_stream << indent(indentation) << "case " << state << ":\n";
                output_stream << indent(indentation) << "{\n";
                output_stream << indent(indentation) << "    state = 1;\n";
                output_stream << indent(indentation) << "    return read_enum(output." << member.name << ", event_data);\n";
                output_stream << indent(indentation) << "}\n";

                return 1;
            }
            else if (is_variant_type(member.type))
            {
                std::pmr::vector<std::pmr::string> const variadic_types = get_variadic_types(member.type.name);

                {
                    output_stream << indent(indentation) << "case " << state << ":\n";
                    output_stream << indent(indentation) << "{\n";
                    output_stream << indent(indentation) << "    if (event == Event::Start_object)\n";
                    output_stream << indent(indentation) << "    {\n";
                    output_stream << indent(indentation) << "        state = " << (state + 2) << ";\n";
                    output_stream << indent(indentation) << "        return true;\n";
                    output_stream << indent(indentation) << "    }\n";
                    output_stream << indent(indentation) << "}\n";
                }

                const int end_object_state = (state + 1);
                {
                    output_stream << indent(indentation) << "case " << end_object_state << ":\n";
                    output_stream << indent(indentation) << "{\n";
                    output_stream << indent(indentation) << "    if (event == Event::End_object)\n";
                    output_stream << indent(indentation) << "    {\n";
                    output_stream << indent(indentation) << "        state = 1;\n";
                    output_stream << indent(indentation) << "        return true;\n";
                    output_stream << indent(indentation) << "    }\n";
                    output_stream << indent(indentation) << "}\n";
                }

                {
                    output_stream << indent(indentation) << "case " << (state + 2) << ":\n";
                    output_stream << indent(indentation) << "{\n";
                    output_stream << indent(indentation) << "    if constexpr (std::is_same_v<Event_data, std::string_view>)\n";
                    output_stream << indent(indentation) << "    {\n";
                    output_stream << indent(indentation) << "        if (event == Event::Key && event_data == \"type\")\n";
                    output_stream << indent(indentation) << "        {\n";
                    output_stream << indent(indentation) << "            state = " << (state + 3) << ";\n";
                    output_stream << indent(indentation) << "            return true;\n";
                    output_stream << indent(indentation) << "        }\n";
                    output_stream << indent(indentation) << "    }\n";
                    output_stream << indent(indentation) << "}\n";
                }

                {
                    output_stream << indent(indentation) << "case " << (state + 3) << ":\n";
                    output_stream << indent(indentation) << "{\n";
                    {
                        output_stream << indent(indentation) << "    if constexpr (std::is_same_v<Event_data, std::string_view>)\n";
                        output_stream << indent(indentation) << "    {\n";

                        for (std::size_t index = 0; index < variadic_types.size(); ++index)
                        {
                            std::string_view const type_name = variadic_types[index];
                            const int next_state = (state + 4 + 3 * index);

                            if (index == 0)
                                output_stream << indent(indentation + 8);

                            output_stream << "if (event_data == \"" << type_name << "\")\n";
                            output_stream << indent(indentation) << "        {\n";
                            output_stream << indent(indentation) << "            output." << member.name << " = " << type_name << "{};\n";
                            output_stream << indent(indentation) << "            state = " << next_state << ";\n";
                            output_stream << indent(indentation) << "            return true;\n";
                            output_stream << indent(indentation) << "        }\n";

                            if ((index + 1) != variadic_types.size())
                            {
                                output_stream << indent(indentation) << "        else ";
                            }
                        }

                        output_stream << indent(indentation) << "    }\n";
                    }
                    output_stream << indent(indentation) << "}\n";
                }

                for (std::size_t index = 0; index < variadic_types.size(); ++index)
                {
                    const int current_state = (state + 4 + 3 * index);
                    std::string_view const type_name = variadic_types[index];
                    Type const type = { .name = std::pmr::string{type_name} };

                    std::pmr::string const output_name = "std::get<" + std::pmr::string{ type_name } + ">(output." + member.name + ")";

                    output_stream << indent(indentation) << "case " << current_state << ":\n";
                    output_stream << indent(indentation) << "{\n";
                    output_stream << indent(indentation) << "    if constexpr (std::is_same_v<Event_data, std::string_view>)\n";
                    output_stream << indent(indentation) << "    {\n";
                    output_stream << indent(indentation) << "        if (event == Event::Key && event_data == \"value\")\n";
                    output_stream << indent(indentation) << "        {\n";
                    output_stream << indent(indentation) << "            state = " << (current_state + 1) << ";\n";
                    output_stream << indent(indentation) << "            return true;\n";
                    output_stream << indent(indentation) << "        }\n";
                    output_stream << indent(indentation) << "    }\n";
                    output_stream << indent(indentation) << "}\n";

                    if (is_enum_type(type, enum_types))
                    {
                        output_stream << indent(indentation) << "case " << (current_state + 1) << ":\n";
                        output_stream << indent(indentation) << "{\n";
                        output_stream << indent(indentation) << "    state = " << end_object_state << ";\n";
                        output_stream << indent(indentation) << "    return read_enum(" << output_name << ", event_data);\n";
                        output_stream << indent(indentation) << "}\n";
                    }
                    else if (is_struct_type(type, struct_types))
                    {
                        generate_read_object_code(
                            output_stream,
                            output_name,
                            current_state + 1,
                            end_object_state,
                            1,
                            indentation
                        );
                    }
                    else
                    {
                        output_stream << indent(indentation) << "case " << (current_state + 1) << ":\n";
                        output_stream << indent(indentation) << "{\n";
                        output_stream << indent(indentation) << "    state = " << end_object_state << ";\n";
                        output_stream << indent(indentation) << "    return read_value(" << output_name << ", \"" << member.name << "\", event_data);\n";
                        output_stream << indent(indentation) << "}\n";
                    }
                }

                return 4 + 3 * static_cast<int>(variadic_types.size());
            }
            else
            {
                output_stream << indent(indentation) << "case " << state << ":\n";
                output_stream << indent(indentation) << "{\n";
                output_stream << indent(indentation) << "    state = 1;\n";
                output_stream << indent(indentation) << "    return read_value(output." << member.name << ", \"" << member.name << "\", event_data);\n";
                output_stream << indent(indentation) << "}\n";

                return 1;
            }
        }
    }

    std::pmr::string generate_read_struct_json_code(
        Struct const& struct_type,
        std::pmr::unordered_map<std::pmr::string, Enum> const& enum_types,
        std::pmr::unordered_map<std::pmr::string, Struct> const& struct_types,
        int const indentation
    )
    {
        std::stringstream output_stream;

        output_stream << indent(indentation) << "export template<typename Event_data>\n";
        output_stream << indent(indentation) << "    bool read_object(\n";
        output_stream << indent(indentation) << "        " << struct_type.name << "& output,\n";
        output_stream << indent(indentation) << "        Event const event,\n";
        output_stream << indent(indentation) << "        Event_data const event_data,\n";
        output_stream << indent(indentation) << "        std::pmr::vector<int>& state_stack,\n";
        output_stream << indent(indentation) << "        std::size_t const state_stack_position\n";
        output_stream << indent(indentation) << "    )\n";
        output_stream << indent(indentation) << "{\n";
        output_stream << indent(indentation) << "    if (state_stack_position >= state_stack.size())\n";
        output_stream << indent(indentation) << "    {\n";
        output_stream << indent(indentation) << "        return false;\n";
        output_stream << indent(indentation) << "    }\n";
        output_stream << "\n";
        output_stream << indent(indentation) << "    int& state = state_stack[state_stack_position];\n";
        output_stream << "\n";
        output_stream << indent(indentation) << "    switch (state)\n";
        output_stream << indent(indentation) << "    {\n";
        output_stream << indent(indentation) << "    case 0:\n";
        output_stream << indent(indentation) << "    {\n";
        output_stream << indent(indentation) << "        if (event == Event::Start_object)\n";
        output_stream << indent(indentation) << "        {\n";
        output_stream << indent(indentation) << "            state = 1;\n";
        output_stream << indent(indentation) << "            return true;\n";
        output_stream << indent(indentation) << "        }\n";
        output_stream << indent(indentation) << "        break;\n";
        output_stream << indent(indentation) << "    }\n";
        output_stream << indent(indentation) << "    case 1:\n";
        output_stream << indent(indentation) << "    {\n";
        output_stream << indent(indentation) << "        switch (event)\n";
        output_stream << indent(indentation) << "        {\n";
        output_stream << indent(indentation) << "        case Event::Key:\n";
        output_stream << indent(indentation) << "        {\n";
        output_stream << indent(indentation) << "            if constexpr (std::is_same_v<Event_data, std::string_view>)\n";
        output_stream << indent(indentation) << "            {\n";

        constexpr int first_member_parse_state = 3;

        {
            int current_state = first_member_parse_state;

            if (!struct_type.members.empty())
            {
                Member const& member = struct_type.members[0];

                int const state_count = generate_read_struct_member_key_code(
                    output_stream,
                    struct_type.name,
                    member,
                    current_state,
                    struct_types,
                    indentation + 16,
                    true
                );

                current_state += state_count;
            }

            for (std::size_t member_index = 1; member_index < struct_type.members.size(); ++member_index)
            {
                Member const& member = struct_type.members[member_index];

                output_stream << indent(indentation) << "                else ";

                int const state_count = generate_read_struct_member_key_code(
                    output_stream,
                    struct_type.name,
                    member,
                    current_state,
                    struct_types,
                    indentation + 16,
                    false
                );

                current_state += state_count;
            }
        }

        output_stream << indent(indentation) << "            }\n";
        output_stream << indent(indentation) << "            break;\n";
        output_stream << indent(indentation) << "        }\n";
        output_stream << indent(indentation) << "        case Event::End_object:\n";
        output_stream << indent(indentation) << "        {\n";
        output_stream << indent(indentation) << "            state = 2;\n";
        output_stream << indent(indentation) << "            return true;\n";
        output_stream << indent(indentation) << "        }\n";
        output_stream << indent(indentation) << "        default:\n";
        output_stream << indent(indentation) << "            break;\n";
        output_stream << indent(indentation) << "        }\n";
        output_stream << indent(indentation) << "        break;\n";
        output_stream << indent(indentation) << "    }\n";
        output_stream << indent(indentation) << "    case 2:\n";
        output_stream << indent(indentation) << "    {\n";
        output_stream << indent(indentation) << "        std::cerr << \"While parsing '" << struct_type.name << "' unexpected '}' found.\\n\";\n";
        output_stream << indent(indentation) << "        return false;\n";
        output_stream << indent(indentation) << "    }\n";

        {
            int current_state = first_member_parse_state;

            for (std::size_t member_index = 0; member_index < struct_type.members.size(); ++member_index)
            {
                Member const& member = struct_type.members[member_index];

                int const state_count = generate_read_struct_member_value_code(
                    output_stream,
                    struct_type.name,
                    member,
                    current_state,
                    enum_types,
                    struct_types,
                    indentation + 4
                );

                current_state += state_count;
            }
        }

        output_stream << indent(indentation) << "    }\n";
        output_stream << "\n";
        output_stream << indent(indentation) << "    std::cerr << \"Error while reading '" << struct_type.name << "'.\\n\";\n";
        output_stream << indent(indentation) << "    return false;\n";
        output_stream << indent(indentation) << "}\n";

        return std::pmr::string{ output_stream.str() };
    }

    namespace
    {
        void generate_write_value_json_code(
            std::stringstream& output_stream,
            Type const& type,
            std::string_view const name
        )
        {
            if (is_string_type(type))
            {
                output_stream << "writer.String(" << name << ".data(), " << name << ".size());";
            }
            else
            {
                output_stream << "writer.";

                if (is_bool_type(type))
                {
                    output_stream << "Bool";
                }
                else if (is_int_type(type))
                {
                    output_stream << "Int";
                }
                else if (is_int64_type(type))
                {
                    output_stream << "Int64";
                }
                else if (is_uint_type(type))
                {
                    output_stream << "Uint";
                }
                else if (is_uint64_type(type))
                {
                    output_stream << "Uint64";
                }
                else if (is_double_type(type))
                {
                    output_stream << "Double";
                }
                else
                {
                    throw std::runtime_error{ std::format("Type '{}' not handled!", type.name) };
                }

                output_stream << "(" << name << ");";
            }
        }
    }

    std::pmr::string generate_write_struct_json_code(
        Struct const& struct_type,
        std::pmr::unordered_map<std::pmr::string, Enum> const& enum_types,
        std::pmr::unordered_map<std::pmr::string, Struct> const& struct_types,
        int const indentation
    )
    {
        std::stringstream output_stream;

        output_stream << indent(indentation) << "export template<typename Writer_type>\n";
        output_stream << indent(indentation) << "    void write_object(\n";
        output_stream << indent(indentation) << "        Writer_type& writer,\n";
        output_stream << indent(indentation) << "        " << struct_type.name << " const& output\n";
        output_stream << indent(indentation) << "    )\n";
        output_stream << indent(indentation) << "{\n";
        output_stream << indent(indentation) << "    writer.StartObject();\n";

        for (Member const& member : struct_type.members)
        {
            if (is_variant_type(member.type))
            {
                output_stream << indent(indentation) << "    writer.Key(\"data\");\n";
                output_stream << "\n";
                output_stream << indent(indentation) << "    writer.StartObject();\n";

                std::pmr::vector<std::pmr::string> const type_names = get_variadic_types(
                    member.type.name
                );

                for (std::size_t index = 0; index < type_names.size(); ++index)
                {
                    std::pmr::string const& type_name = type_names[index];
                    Type const underlying_type = { .name = type_name };

                    output_stream << indent(indentation + 4);
                    if (index != 0)
                    {
                        output_stream << "else ";
                    }
                    output_stream << "if (std::holds_alternative<" << type_name << ">(output." << member.name << "))\n";
                    output_stream << indent(indentation) << "    {\n";
                    output_stream << indent(indentation) << "        writer.Key(\"type\");\n";
                    output_stream << indent(indentation) << "        writer.String(\"" << type_name << "\");\n";
                    output_stream << indent(indentation) << "        writer.Key(\"value\");\n";

                    if (is_enum_type(underlying_type, enum_types))
                    {
                        output_stream << indent(indentation) << "        {\n";
                        output_stream << indent(indentation) << "            " << type_name << " const& value = std::get<" << type_name << ">(output." << member.name << ");\n";
                        output_stream << indent(indentation) << "            std::string_view const enum_value_string = write_enum(value);\n";
                        output_stream << indent(indentation) << "            writer.String(enum_value_string.data(), enum_value_string.size());\n";
                        output_stream << indent(indentation) << "        }\n";
                    }
                    else if (is_struct_type(underlying_type, struct_types))
                    {
                        output_stream << indent(indentation) << "        " << type_name << " const& value = std::get<" << type_name << ">(output." << member.name << ");\n";
                        output_stream << indent(indentation) << "        write_object(writer, value);\n";
                    }
                    else
                    {
                        output_stream << indent(indentation) << "        " << type_name << " const& value = std::get<" << type_name << ">(output." << member.name << ");\n";
                        output_stream << indent(indentation) << "        ";
                        generate_write_value_json_code(output_stream, underlying_type, "value");
                        output_stream << '\n';
                    }

                    output_stream << indent(indentation) << "    }\n";
                }

                output_stream << indent(indentation) << "    writer.EndObject();\n\n";
            }
            else
            {
                if (is_optional_type(member.type))
                {
                    Type const value_type = Type{ get_optional_value_type(member.type) };
                    if (is_struct_type(value_type, struct_types))
                    {
                        output_stream << indent(indentation) << "    write_optional_object(writer, \"" << member.name << "\", output." << member.name << ");\n";
                    }
                    else
                    {
                        output_stream << indent(indentation) << "    write_optional(writer, \"" << member.name << "\", output." << member.name << ");\n";
                    }
                }
                else
                {
                    output_stream << indent(indentation) << "    writer.Key(\"" << member.name << "\");\n";

                    if (is_struct_type(member.type, struct_types) || is_vector_type(member.type))
                    {
                        output_stream << indent(indentation) << "    write_object(writer, output." << member.name << ");\n";
                    }
                    else if (is_enum_type(member.type, enum_types))
                    {
                        output_stream << indent(indentation) << "    {\n";
                        output_stream << indent(indentation) << "        std::string_view const enum_value_string = write_enum(output." << member.name << ");\n";
                        output_stream << indent(indentation) << "        writer.String(enum_value_string.data(), enum_value_string.size());\n";
                        output_stream << indent(indentation) << "    }\n";
                    }
                    else
                    {
                        output_stream << indent(indentation) << "    ";
                        std::pmr::string const name = "output." + member.name;
                        generate_write_value_json_code(output_stream, member.type, name);
                        output_stream << '\n';
                    }
                }
            }
        }

        output_stream << indent(indentation) << "    writer.EndObject();\n";
        output_stream << indent(indentation) << "}\n";

        return std::pmr::string{ output_stream.str() };
    }

    namespace
    {
        std::optional<Enum> parse_enum(std::istream& input_stream)
        {
            std::pmr::string name;
            input_stream >> name;

            if (name == "class")
            {
                input_stream >> name;
            }

            if (name.back() == ';')
            {
                return std::nullopt;
            }

            std::stringstream enum_content_string_stream;

            while (input_stream.good())
            {
                std::pmr::string string;
                input_stream >> string;
                enum_content_string_stream << string;

                if (string.back() == ';')
                {
                    break;
                }
            }

            std::string const enum_content = enum_content_string_stream.str();

            auto const open_bracket_location = std::find(enum_content.begin(), enum_content.end(), '{');
            auto const close_bracket_location = std::find(open_bracket_location + 1, enum_content.end(), '}');

            std::pmr::vector<std::pmr::string> enum_values;

            {
                auto const is_alphabetic = [](char const c) -> bool
                {
                    return std::isalpha(c) != 0;
                };

                auto const is_not_alphabetic_neither_digit = [](char const c) -> bool
                {
                    return (std::isalpha(c) == 0) && (std::isdigit(c) == 0) && (c != '_') && (c != '-');
                };

                auto current_location = open_bracket_location + 1;

                while ((current_location != close_bracket_location) && (current_location != enum_content.end()))
                {
                    auto const alphabetic_location = std::find_if(current_location, enum_content.end(), is_alphabetic);
                    auto const space_or_equal_or_comma_location = std::find_if(alphabetic_location, enum_content.end(), is_not_alphabetic_neither_digit);

                    enum_values.push_back(std::pmr::string{ alphabetic_location, space_or_equal_or_comma_location });

                    current_location = std::find(space_or_equal_or_comma_location, enum_content.end(), ',');
                }
            }

            return Enum
            {
                .name = std::move(name),
                .values = std::move(enum_values)
            };
        }

        std::optional<std::pair<std::pmr::string, Type>> parse_using_type(
            std::span<std::pmr::string const> const strings
        )
        {
            if (strings[0] != "using" || (strings.size() < 4))
            {
                return std::nullopt;
            }

            std::pmr::string const& name = strings[1];

            std::stringstream string_stream;

            for (std::size_t i = 3; i < strings.size(); ++i)
            {
                std::string_view const string = strings[i];
                if (string.back() == ';')
                {
                    std::string_view const value = { string.begin(), string.end() - 1 };
                    string_stream << value;

                    Type type
                    {
                        .name = std::pmr::string{string_stream.str()}
                    };

                    return std::make_pair(name, std::move(type));
                }

                string_stream << string;
            }

            return std::nullopt;
        }

        std::optional<Struct> parse_struct(std::istream& input_stream)
        {
            std::pmr::string name;
            input_stream >> name;

            if (name.back() == ';')
            {
                return std::nullopt;
            }

            std::pmr::vector<std::pmr::string> strings;

            while (input_stream.good())
            {
                std::pmr::string string;
                input_stream >> string;

                if (string.empty())
                {
                    continue;
                }

                strings.push_back(string);

                if (string == "};")
                {
                    break;
                }
            }

            strings.erase(strings.begin());
            strings.pop_back();

            std::pmr::vector<std::pair<std::pmr::string, Type>> using_types;
            std::pmr::vector<std::pmr::string> member_strings;

            for (std::size_t i = 0; i < strings.size();)
            {
                auto const begin_location = strings.begin() + i;

                auto const semicolon_location = std::find_if(
                    begin_location + 1,
                    strings.end(),
                    [](std::pmr::string const& string) -> bool { return string.back() == ';'; }
                );

                if (*begin_location == "using")
                {
                    std::optional<std::pair<std::pmr::string, Type>> const using_type =
                        parse_using_type({ begin_location, semicolon_location + 1 });

                    if (using_type)
                    {
                        using_types.push_back(*using_type);
                    }
                    else
                    {
                        throw std::runtime_error{ "Failed to parse 'using <type> = <type>;' expression." };
                    }

                    i += 1 + std::distance(begin_location, semicolon_location);
                }
                else if (*begin_location == "friend" || *begin_location == "auto")
                {
                    i += 1 + std::distance(begin_location, semicolon_location);
                }
                else
                {
                    for (auto iterator = begin_location; iterator != semicolon_location; ++iterator)
                    {
                        member_strings.push_back(*iterator);
                        ++i;
                    }
                    member_strings.push_back(*semicolon_location);
                    ++i;
                }
            }

            std::pmr::vector<std::pair<std::pmr::string, std::pmr::string>> values;

            for (std::size_t i = 0; i < member_strings.size();)
            {
                std::pmr::string const& type_name = member_strings[i];

                auto const using_type_location = std::find_if(
                    using_types.begin(),
                    using_types.end(),
                    [&type_name](std::pair<std::pmr::string, Type> const& pair) { return pair.first == type_name; }
                );

                if (using_type_location != using_types.end())
                {
                    std::pmr::string const& member_name = member_strings[i + 1];
                    if (member_name.back() == ';')
                    {
                        std::pmr::string value = { member_name.begin(), member_name.end() - 1 };
                        values.push_back(std::make_pair(using_type_location->second.name, value));
                    }
                    else
                    {
                        values.push_back(std::make_pair(using_type_location->second.name, member_name));
                    }
                }
                else
                {
                    std::pmr::string const& member_name = member_strings[i + 1];
                    if (member_name.back() == ';')
                    {
                        std::pmr::string value = { member_name.begin(), member_name.end() - 1 };
                        values.push_back(std::make_pair(type_name, value));
                    }
                    else
                    {
                        values.push_back(std::make_pair(type_name, member_name));
                    }
                }

                auto const begin_location = member_strings.begin() + i;
                auto const semicolon_location = std::find_if(
                    begin_location + 1,
                    member_strings.end(),
                    [](std::pmr::string const& string) -> bool { return string.back() == ';'; }
                );

                i += 1 + std::distance(begin_location, semicolon_location);
            }

            std::pmr::vector<Member> members;

            for (std::size_t i = 0; i < values.size(); ++i)
            {
                std::pmr::string const& type_name = values[i].first;
                std::pmr::string const& member_name = values[i].second;

                members.push_back(
                    Member
                    {
                        .type = Type
                        {
                            .name = type_name,
                        },
                        .name = member_name
                    }
                );
            }

            return Struct
            {
                .name = std::move(name),
                .members = std::move(members)
            };
        }

        template<typename Value_type>
        std::pmr::unordered_map<std::pmr::string, Value_type> create_name_map(
            std::span<Value_type const> const values
        )
        {
            std::pmr::unordered_map<std::pmr::string, Value_type> map;
            map.reserve(values.size());

            for (Value_type const& value : values)
            {
                map.insert(std::make_pair(value.name, value));
            }

            return map;
        }

        void generate_write_forward_declarations(
            std::ostream& output_stream,
            std::span<Struct const> const structs,
            int const indentation
        )
        {
            for (Struct const struct_type : structs)
            {
                output_stream << indent(indentation) << "export template<typename Writer_type>\n";
                output_stream << indent(indentation) << "    void write_object(\n";
                output_stream << indent(indentation) << "        Writer_type& writer,\n";
                output_stream << indent(indentation) << "        " << struct_type.name << " const& input\n";
                output_stream << indent(indentation) << "    );\n";
                output_stream << "\n";
            }
        }
    }

    File_types identify_file_types(
        std::istream& input_stream
    )
    {
        std::pmr::vector<Enum> enums;
        std::pmr::vector<Struct> structs;

        while (input_stream.good())
        {
            std::pmr::string value;
            input_stream >> value;

            if (value == "enum")
            {
                std::optional<Enum> const enum_type = parse_enum(input_stream);

                if (enum_type)
                {
                    enums.push_back(*enum_type);
                }
            }
            else if (value == "struct")
            {
                std::optional<Struct> const struct_type = parse_struct(input_stream);

                if (struct_type)
                {
                    structs.push_back(*struct_type);
                }
            }
        }

        std::pmr::unordered_map<std::pmr::string, Enum> const enum_map = create_name_map<Enum>(
            enums
        );

        std::pmr::unordered_map<std::pmr::string, Struct> struct_map = create_name_map<Struct>(
            structs
        );

        return File_types
        {
            .enums = std::move(enums),
            .structs = std::move(structs)
        };
    }

    void generate_read_json_code(
        std::istream& input_stream,
        std::ostream& output_stream,
        std::string_view const export_module_name,
        std::string_view const module_name_to_import,
        std::string_view const namespace_name
    )
    {
        File_types const file_types = identify_file_types(
            input_stream
        );

        std::pmr::unordered_map<std::pmr::string, Enum> const enum_map = create_name_map<Enum>(
            file_types.enums
        );

        std::pmr::unordered_map<std::pmr::string, Struct> struct_map = create_name_map<Struct>(
            file_types.structs
        );

        output_stream << "module;\n";
        output_stream << '\n';
        output_stream << "#include <format>\n";
        output_stream << "#include <iostream>\n";
        output_stream << "#include <memory_resource>\n";
        output_stream << "#include <optional>\n";
        output_stream << "#include <variant>\n";
        output_stream << "#include <vector>\n";
        output_stream << '\n';
        output_stream << "export module " << export_module_name << ";\n";
        output_stream << '\n';
        output_stream << "import " << module_name_to_import << ";\n";
        output_stream << '\n';
        output_stream << "namespace " << namespace_name << '\n';
        output_stream << "{\n";
        output_stream << "    export struct Stack_state\n";
        output_stream << "    {\n";
        output_stream << "        void* pointer;\n";
        output_stream << "        std::pmr::string type;\n";
        output_stream << "        std::optional<Stack_state>(*get_next_state)(Stack_state* state, std::string_view key);\n";
        output_stream << "\n";
        output_stream << "        void (*set_vector_size)(Stack_state const* state, std::size_t size);\n";
        output_stream << "        void* (*get_element)(Stack_state const* state, std::size_t index);\n";
        output_stream << "        std::optional<Stack_state>(*get_next_state_element)(Stack_state* state, std::string_view key);\n";
        output_stream << "\n";
        output_stream << "        void (*set_variant_type)(Stack_state* state, std::string_view type);\n";
        output_stream << "    };\n";
        output_stream << "\n";

        // Generate read_enum()
        output_stream << "    export template<typename Enum_type, typename Event_value>\n";
        output_stream << "        bool read_enum(Enum_type& output, Event_value const value)\n";
        output_stream << "    {\n";
        output_stream << "        return false;\n";
        output_stream << "    };\n";
        output_stream << "\n";
        for (Enum const& enum_type : file_types.enums)
        {
            output_stream << generate_read_enum_json_code(enum_type, 4);
            output_stream << "\n";
        }

        // Generate read_enum_value()
        output_stream << "    export std::optional<int> get_enum_value(std::string_view const type, std::string_view const value)\n";
        output_stream << "    {\n";
        for (Enum const& enum_type : file_types.enums)
        {
            output_stream << std::format("        if (type == \"{}\")\n", enum_type.name);
            output_stream << "        {\n";
            output_stream << std::format("            {} enum_value;\n", enum_type.name);
            output_stream << "            read_enum(enum_value, value);\n";
            output_stream << "            return static_cast<int>(enum_value);\n";
            output_stream << "        }\n\n";
        }
        output_stream << "        return {};\n";
        output_stream << "    }\n\n";

        // Generate get_next_state_vector
        output_stream << "    std::optional<Stack_state> get_next_state_vector(Stack_state* state, std::string_view const key)\n";
        output_stream << "    {\n";
        output_stream << "        if (key == \"size\")\n";
        output_stream << "        {\n";
        output_stream << "            return Stack_state\n";
        output_stream << "            {\n";
        output_stream << "                .pointer = state->pointer,\n";
        output_stream << "                .type = \"vector_size\",\n";
        output_stream << "                .get_next_state = nullptr,\n";
        output_stream << "            };\n";
        output_stream << "        }\n";
        output_stream << "        else if (key == \"elements\")\n";
        output_stream << "        {\n";
        output_stream << "            return Stack_state\n";
        output_stream << "            {\n";
        output_stream << "                .pointer = state->pointer,\n";
        output_stream << "                .type = \"vector_elements\",\n";
        output_stream << "                .get_next_state = nullptr\n";
        output_stream << "            };\n";
        output_stream << "        }\n";
        output_stream << "        else\n";
        output_stream << "        {\n";
        output_stream << "            return {};\n";
        output_stream << "        }\n";
        output_stream << "    }\n\n";

        // Forward declare get_next_state
        for (Struct const& struct_info : file_types.structs)
        {
            output_stream << "    export std::optional<Stack_state> get_next_state_" << to_lowercase(struct_info.name) << "(Stack_state* state, std::string_view const key);\n";
        }

        // Generate get_next_state
        for (Struct const& struct_info : file_types.structs)
        {
            output_stream << "    export std::optional<Stack_state> get_next_state_" << to_lowercase(struct_info.name) << "(Stack_state* state, std::string_view const key)\n";
            output_stream << "    {\n";
            output_stream << std::format("        h::{}* parent = static_cast<h::{}*>(state->pointer);\n", struct_info.name, struct_info.name);
            output_stream << '\n';

            for (Member const& member : struct_info.members)
            {
                output_stream << std::format("        if (key == \"{}\")\n", member.name);
                output_stream << "        {\n";

                if (is_vector_type(member.type))
                {
                    output_stream << "            auto const set_vector_size = [](Stack_state const* const state, std::size_t const size) -> void\n";
                    output_stream << "            {\n";
                    output_stream << std::format("                {}* parent = static_cast<{}*>(state->pointer);\n", member.type.name, member.type.name);
                    output_stream << "                parent->resize(size);\n";
                    output_stream << "            };\n\n";

                    output_stream << "            auto const get_element = [](Stack_state const* const state, std::size_t const index) -> void*\n";
                    output_stream << "            {\n";
                    output_stream << std::format("                {}* parent = static_cast<{}*>(state->pointer);\n", member.type.name, member.type.name);
                    output_stream << "                return &((*parent)[index]);\n";
                    output_stream << "            };\n";
                }
                else if (is_variant_type(member.type))
                {
                    std::pmr::vector<std::pmr::string> const variadic_types = get_variadic_types(member.type.name);
                    std::pmr::string const variant_type = create_formatted_variant_type(variadic_types);

                    output_stream << "            auto const set_variant_type = [](Stack_state* state, std::string_view const type) -> void\n";
                    output_stream << "            {\n";
                    output_stream << std::format("                using Variant_type = {};\n", variant_type);
                    output_stream << "                Variant_type* pointer = static_cast<Variant_type*>(state->pointer);\n";
                    output_stream << "\n";

                    for (std::pmr::string const& type : variadic_types)
                    {
                        output_stream << std::format("                if (type == \"{}\")\n", type);
                        output_stream << "                {\n";
                        output_stream << std::format("                    *pointer = {}{};\n", type, "{}");
                        output_stream << std::format("                    state->type = \"{}\";\n", type);
                        output_stream << "                    return;\n";

                        output_stream << "                }\n";
                    }

                    output_stream << "            };\n";
                    output_stream << "\n";

                    output_stream << "            auto const get_next_state = [](Stack_state* state, std::string_view const key) -> std::optional<Stack_state>\n";
                    output_stream << "            {\n";
                    output_stream << "                if (key == \"type\")\n";
                    output_stream << "                {\n";
                    output_stream << "                    return Stack_state\n";
                    output_stream << "                    {\n";
                    output_stream << "                        .pointer = state->pointer,\n";
                    output_stream << "                        .type = \"variant_type\",\n";
                    output_stream << "                        .get_next_state = nullptr\n";
                    output_stream << "                    };\n";
                    output_stream << "                }\n";
                    output_stream << "\n";
                    output_stream << "                if (key == \"value\")\n";
                    output_stream << "                {\n";

                    output_stream << "                    auto const get_next_state_function = [&]() -> std::optional<Stack_state>(*)(Stack_state* state, std::string_view key)\n";
                    output_stream << "                    {\n";
                    for (std::pmr::string const& type : variadic_types)
                    {
                        output_stream << std::format("                        if (state->type == \"{}\")\n", type);
                        output_stream << "                        {\n";
                        if (is_struct_type(Type{ type }, struct_map))
                        {
                            output_stream << std::format("                            return get_next_state_{};\n", to_lowercase(type));
                        }
                        else
                        {
                            output_stream << "                            return nullptr;\n";
                        }
                        output_stream << "                        }\n";
                        output_stream << "\n";
                    }
                    output_stream << "                        return nullptr;\n";
                    output_stream << "                    };\n";
                    output_stream << "\n";
                    output_stream << "                    return Stack_state\n";
                    output_stream << "                    {\n";
                    output_stream << "                        .pointer = state->pointer,\n";
                    output_stream << "                        .type = \"variant_value\",\n";
                    output_stream << "                        .get_next_state = get_next_state_function()\n";
                    output_stream << "                    };\n";
                    output_stream << "                }\n";
                    output_stream << "\n";
                    output_stream << "                return {};\n";
                    output_stream << "            };\n";
                    output_stream << "\n";
                }
                else if (is_optional_type(member.type))
                {
                    std::pmr::string const value_type = get_optional_value_type(member.type);
                    output_stream << std::format("            parent->{} = {}{}{};", member.name, is_cpp_type(member.type) ? "" : "h::", value_type, "{}");
                }
                output_stream << "\n";

                output_stream << "            return Stack_state\n";
                output_stream << "            {\n";

                if (is_optional_type(member.type))
                {
                    std::pmr::string const value_type = get_optional_value_type(member.type);
                    output_stream << std::format("                .pointer = &parent->{}.value(),\n", member.name);
                    output_stream << std::format("                .type = \"{}\",\n", value_type);
                }
                else
                {
                    output_stream << std::format("                .pointer = &parent->{},\n", member.name);
                    output_stream << std::format("                .type = \"{}\",\n", member.type.name);
                }

                if (is_struct_type(member.type, struct_map))
                {
                    output_stream << std::format("                .get_next_state = get_next_state_{},\n", to_lowercase(member.type.name));
                }
                else if (is_vector_type(member.type))
                {
                    Type const value_type = Type{ get_vector_value_type(member.type) };
                    output_stream << "                .get_next_state = get_next_state_vector,\n";
                    output_stream << "                .set_vector_size = set_vector_size,\n";
                    output_stream << "                .get_element = get_element,\n";

                    if (is_struct_type(value_type, struct_map))
                    {
                        output_stream << std::format("                .get_next_state_element = get_next_state_{}\n", to_lowercase(value_type.name));
                    }
                    else if (is_optional_type(value_type))
                    {
                        Type const optional_value_type = Type{ get_optional_value_type(value_type) };
                        if (is_struct_type(optional_value_type, struct_map))
                        {
                            output_stream << std::format("                .get_next_state_element = get_next_state_{}\n", to_lowercase(optional_value_type.name));
                        }
                        else
                        {
                            output_stream << "                .get_next_state_element = nullptr,\n";
                        }
                    }
                    else
                    {
                        output_stream << "                .get_next_state_element = nullptr\n";
                    }
                }
                else if (is_variant_type(member.type))
                {
                    output_stream << "                .get_next_state = get_next_state,\n";
                    output_stream << "                .set_variant_type = set_variant_type,\n";
                }
                else if (is_optional_type(member.type))
                {
                    Type const value_type = Type{ get_optional_value_type(member.type) };
                    if (is_struct_type(value_type, struct_map))
                    {
                        output_stream << std::format("                .get_next_state = get_next_state_{}\n", to_lowercase(value_type.name));
                    }
                    else
                    {
                        output_stream << "                .get_next_state = nullptr,\n";
                    }
                }
                else
                {
                    output_stream << "                .get_next_state = nullptr,\n";
                }

                output_stream << "            };\n";
                output_stream << "        }\n";
                output_stream << '\n';
            }

            output_stream << "        return {};\n";
            output_stream << "    }\n";
            output_stream << "\n";
        }

        // Generate get_first_state()
        output_stream << "    export template<typename Struct_type>\n";
        output_stream << "        Stack_state get_first_state(Struct_type* output)\n";
        output_stream << "    {\n";
        for (Struct const& struct_info : file_types.structs)
        {
            output_stream << std::format("        if constexpr (std::is_same_v<Struct_type, h::{}>)\n", struct_info.name);
            output_stream << "        {\n";
            output_stream << "            return Stack_state\n";
            output_stream << "            {\n";
            output_stream << "                .pointer = output,\n";
            output_stream << std::format("                .type = \"{}\",\n", struct_info.name);
            output_stream << std::format("                .get_next_state = get_next_state_{}\n", to_lowercase(struct_info.name));
            output_stream << "            };\n";
            output_stream << "        }\n";
            output_stream << "\n";
        }
        output_stream << "    }\n";

        output_stream << "}\n";

        /*output_stream << "module;\n";
        output_stream << '\n';
        output_stream << "#include <format>\n";
        output_stream << "#include <iostream>\n";
        output_stream << "#include <memory_resource>\n";
        output_stream << "#include <variant>\n";
        output_stream << "#include <vector>\n";
        output_stream << '\n';
        output_stream << "export module " << export_module_name << ";\n";
        output_stream << '\n';
        output_stream << "import " << module_name_to_import << ";\n";
        output_stream << '\n';
        output_stream << "namespace " << namespace_name << '\n';
        output_stream << "{\n";
        output_stream << "    export enum class Event\n";
        output_stream << "    {\n";
        output_stream << "        Start_object,\n";
        output_stream << "        End_object,\n";
        output_stream << "        Start_array,\n";
        output_stream << "        End_array,\n";
        output_stream << "        Key,\n";
        output_stream << "        Value\n";
        output_stream << "    };\n";
        output_stream << "\n";
        output_stream << "    export struct No_event_data\n";
        output_stream << "    {\n";
        output_stream << "    };\n";
        output_stream << "\n";
        output_stream << "    export template<typename Output_type, typename Value_type>\n";
        output_stream << "        bool read_value(\n";
        output_stream << "            Output_type& output,\n";
        output_stream << "            std::string_view const key,\n";
        output_stream << "            Value_type const value\n";
        output_stream << "        )\n";
        output_stream << "    {\n";
        output_stream << "        if constexpr (std::is_arithmetic_v<Output_type> && std::is_arithmetic_v<Value_type>)\n";
        output_stream << "        {\n";
        output_stream << "            output = static_cast<Output_type>(value);\n";
        output_stream << "            return true;\n";
        output_stream << "        }\n";
        output_stream << "        else if constexpr (std::is_same_v<Output_type, std::pmr::string> && std::is_same_v<Value_type, std::string_view>)\n";
        output_stream << "        {\n";
        output_stream << "            output = value;\n";
        output_stream << "            return true;\n";
        output_stream << "        }\n";
        output_stream << "        else\n";
        output_stream << "        {\n";
        output_stream << "            std::cerr << std::format(\"Incompatible type found while parsing key '{}'.\\n\", key);\n";
        output_stream << "            return false;\n";
        output_stream << "        }\n";
        output_stream << "    }\n";
        output_stream << "\n";
        output_stream << "    template<typename Object_type, typename Event_data>\n";
        output_stream << "    bool read_object(\n";
        output_stream << "        Object_type& output,\n";
        output_stream << "        Event const event,\n";
        output_stream << "        Event_data const event_data,\n";
        output_stream << "        std::pmr::vector<int>& state_stack,\n";
        output_stream << "        std::size_t const state_stack_position\n";
        output_stream << "    );\n";
        output_stream << "\n";
        output_stream << "    export template<typename Output_type, typename Event_data>\n";
        output_stream << "        bool read_object(\n";
        output_stream << "            std::pmr::vector<Output_type>& output,\n";
        output_stream << "            Event const event,\n";
        output_stream << "            Event_data const event_data,\n";
        output_stream << "            std::pmr::vector<int>& state_stack,\n";
        output_stream << "            std::size_t const state_stack_position\n";
        output_stream << "        )\n";
        output_stream << "    {\n";
        output_stream << "        if (state_stack_position >= state_stack.size())\n";
        output_stream << "        {\n";
        output_stream << "            return false;\n";
        output_stream << "        }\n";
        output_stream << "\n";
        output_stream << "        int& state = state_stack[state_stack_position];\n";
        output_stream << "\n";
        output_stream << "        if (state == 0)\n";
        output_stream << "        {\n";
        output_stream << "            if (event == Event::Start_object)\n";
        output_stream << "            {\n";
        output_stream << "                state = 1;\n";
        output_stream << "                return true;\n";
        output_stream << "            }\n";
        output_stream << "        }\n";
        output_stream << "        else if (state == 1)\n";
        output_stream << "        {\n";
        output_stream << "            if (event == Event::Key)\n";
        output_stream << "            {\n";
        output_stream << "                if constexpr (std::is_same_v<Event_data, std::string_view>)\n";
        output_stream << "                {\n";
        output_stream << "                    if (event_data == \"size\")\n";
        output_stream << "                    {\n";
        output_stream << "                        state = 2;\n";
        output_stream << "                        return true;\n";
        output_stream << "                    }\n";
        output_stream << "                    else if (event_data == \"elements\")\n";
        output_stream << "                    {\n";
        output_stream << "                        state = 3;\n";
        output_stream << "                        return true;\n";
        output_stream << "                    }\n";
        output_stream << "                }\n";
        output_stream << "            }\n";
        output_stream << "        }\n";
        output_stream << "        else if (state == 2)\n";
        output_stream << "        {\n";
        output_stream << "            if (event == Event::Value)\n";
        output_stream << "            {\n";
        output_stream << "                if constexpr (std::is_unsigned_v<Event_data>)\n";
        output_stream << "                {\n";
        output_stream << "                    output.reserve(event_data);\n";
        output_stream << "                    state = 1;\n";
        output_stream << "                    return true;\n";
        output_stream << "                }\n";
        output_stream << "            }\n";
        output_stream << "        }\n";
        output_stream << "        else if (state == 3)\n";
        output_stream << "        {\n";
        output_stream << "            if (event == Event::Start_array)\n";
        output_stream << "            {\n";
        output_stream << "                state = 4;\n";
        output_stream << "                return true;\n";
        output_stream << "            }\n";
        output_stream << "        }\n";
        output_stream << "        else if (state == 4)\n";
        output_stream << "        {\n";
        output_stream << "            if (event == Event::Value)\n";
        output_stream << "            {\n";
        output_stream << "                if constexpr ((std::is_arithmetic_v<Output_type> && std::is_arithmetic_v<Event_data>) || std::is_same_v<Output_type, std::pmr::string>)\n";
        output_stream << "                {\n";
        output_stream << "                    Output_type element;\n";
        output_stream << "                    if (!read_value(element, \"array_element\", event_data))\n";
        output_stream << "                    {\n";
        output_stream << "                        return false;\n";
        output_stream << "                    }\n";
        output_stream << "                    output.push_back(element);\n";
        output_stream << "                    return true;\n";
        output_stream << "                }\n";
        output_stream << "            }\n";
        output_stream << "            else if (event == Event::Start_object)\n";
        output_stream << "            {\n";
        output_stream << "                if constexpr (std::is_class_v<Output_type> && !std::is_same_v<Output_type, std::pmr::string>)\n";
        output_stream << "                {\n";
        output_stream << "                    output.emplace_back();\n";
        output_stream << "                    state = 5;\n";
        output_stream << "                    return read_object(output.back(), event, event_data, state_stack, state_stack_position + 1);\n";
        output_stream << "                }\n";
        output_stream << "            }\n";
        output_stream << "            else if (event == Event::End_array)\n";
        output_stream << "            {\n";
        output_stream << "                state = 6;\n";
        output_stream << "                return true;\n";
        output_stream << "            }\n";
        output_stream << "        }\n";
        output_stream << "        else if (state == 5)\n";
        output_stream << "        {\n";
        output_stream << "            if constexpr (std::is_class_v<Output_type> && !std::is_same_v<Output_type, std::pmr::string>)\n";
        output_stream << "            {\n";
        output_stream << "                if ((event == Event::End_object) && (state_stack_position + 2) == state_stack.size())\n";
        output_stream << "                {\n";
        output_stream << "                    if (!read_object(output.back(), event, event_data, state_stack, state_stack_position + 1))\n";
        output_stream << "                    {\n";
        output_stream << "                        return false;\n";
        output_stream << "                    }\n";
        output_stream << "\n";
        output_stream << "                    state = 4;\n";
        output_stream << "                    return true;\n";
        output_stream << "                }\n";
        output_stream << "                else\n";
        output_stream << "                {\n";
        output_stream << "                    return read_object(output.back(), event, event_data, state_stack, state_stack_position + 1);\n";
        output_stream << "                }\n";
        output_stream << "            }\n";
        output_stream << "        }\n";
        output_stream << "        else if (state == 6)\n";
        output_stream << "        {\n";
        output_stream << "            if (event == Event::End_object)\n";
        output_stream << "            {\n";
        output_stream << "                state = 7;\n";
        output_stream << "                return true;\n";
        output_stream << "            }\n";
        output_stream << "        }\n";
        output_stream << "\n";
        output_stream << "        return false;\n";
        output_stream << "    }\n";
        output_stream << "\n";
        output_stream << "    export template<typename Enum_type, typename Event_value>\n";
        output_stream << "        bool read_enum(Enum_type& output, Event_value const value)\n";
        output_stream << "    {\n";
        output_stream << "        return false;\n";
        output_stream << "    };\n";
        output_stream << "\n";

        for (Enum const& enum_type : file_types.enums)
        {
            output_stream << generate_read_enum_json_code(enum_type, 4);
            output_stream << "\n";
        }

        output_stream << "\n";
        output_stream << "    export template<typename Object_type, typename Event_data>\n";
        output_stream << "        bool read_object(\n";
        output_stream << "            Object_type& output,\n";
        output_stream << "            Event const event,\n";
        output_stream << "            Event_data const event_data,\n";
        output_stream << "            std::pmr::vector<int>& state_stack,\n";
        output_stream << "            std::size_t const state_stack_position\n";
        output_stream << "        );\n";
        output_stream << "\n";

        std::pmr::unordered_map<std::pmr::string, Enum> const enum_map = create_name_map<Enum>(
            file_types.enums
        );

        std::pmr::unordered_map<std::pmr::string, Struct> struct_map = create_name_map<Struct>(
            file_types.structs
        );

        for (Struct const& struct_type : file_types.structs)
        {
            output_stream << generate_read_struct_json_code(struct_type, enum_map, struct_map, 4);
            output_stream << "\n";
        }

        output_stream << "}\n";*/
    }

    void generate_write_json_code(
        std::istream& input_stream,
        std::ostream& output_stream,
        std::string_view const export_module_name,
        std::string_view const module_name_to_import,
        std::string_view const namespace_name
    )
    {
        File_types const file_types = identify_file_types(
            input_stream
        );

        output_stream << "module;\n";
        output_stream << '\n';
        output_stream << "#include <iostream>\n";
        output_stream << "#include <memory_resource>\n";
        output_stream << "#include <optional>\n";
        output_stream << "#include <string_view>\n";
        output_stream << "#include <variant>\n";
        output_stream << "#include <vector>\n";
        output_stream << '\n';
        output_stream << "export module " << export_module_name << ";\n";
        output_stream << '\n';
        output_stream << "import " << module_name_to_import << ";\n";
        output_stream << '\n';
        output_stream << "namespace " << namespace_name << '\n';
        output_stream << "{\n";

        for (Enum const& enum_type : file_types.enums)
        {
            output_stream << generate_write_enum_json_code(enum_type, 4);
            output_stream << "\n";
        }

        generate_write_forward_declarations(output_stream, file_types.structs, 4);

        output_stream << "    template <typename C> struct Is_optional : std::false_type {};\n";
        output_stream << "    template <typename T> struct Is_optional< std::optional<T> > : std::true_type {};\n";
        output_stream << "    template <typename C> inline constexpr bool Is_optional_v = Is_optional<C>::value;\n";
        output_stream << "\n";
        output_stream << "    export template <typename Writer_type, typename Value_type>\n";
        output_stream << "        void write_value(\n";
        output_stream << "            Writer_type& writer,\n";
        output_stream << "            Value_type const& value\n";
        output_stream << "        )\n";
        output_stream << "    {\n";
        output_stream << "        if constexpr (std::is_unsigned_v<Value_type> && sizeof(Value_type) <= 4)\n";
        output_stream << "        {\n";
        output_stream << "            writer.Uint(value);\n";
        output_stream << "        }\n";
        output_stream << "        else if constexpr (std::is_unsigned_v<Value_type>)\n";
        output_stream << "        {\n";
        output_stream << "            writer.Uint64(value);\n";
        output_stream << "        }\n";
        output_stream << "        else if constexpr (std::is_signed_v<Value_type> && sizeof(Value_type) <= 4)\n";
        output_stream << "        {\n";
        output_stream << "            writer.Int(value);\n";
        output_stream << "        }\n";
        output_stream << "        else if constexpr (std::is_signed_v<Value_type>)\n";
        output_stream << "        {\n";
        output_stream << "            writer.Int64(value);\n";
        output_stream << "        }\n";
        output_stream << "        else if constexpr (std::is_floating_point_v<Value_type>)\n";
        output_stream << "        {\n";
        output_stream << "            writer.Double(value);\n";
        output_stream << "        }\n";
        output_stream << "        else if constexpr (std::is_same_v<Value_type, std::string> || std::is_same_v<Value_type, std::pmr::string> || std::is_same_v<Value_type, std::string_view>)\n";
        output_stream << "        {\n";
        output_stream << "            writer.String(value.data(), value.size());\n";
        output_stream << "        }\n";
        output_stream << "        else if constexpr (std::is_enum_v<Value_type>)\n";
        output_stream << "        {\n";
        output_stream << "            {\n";
        output_stream << "                std::string_view const enum_value_string = write_enum(value);\n";
        output_stream << "                writer.String(enum_value_string.data(), enum_value_string.size());\n";
        output_stream << "            }\n";
        output_stream << "        }\n";
        output_stream << "        else if constexpr (Is_optional_v<Value_type>)\n";
        output_stream << "        {\n";
        output_stream << "            if (value.has_value())\n";
        output_stream << "            {\n";
        output_stream << "                write_value(writer, value.value());\n";
        output_stream << "            }\n";
        output_stream << "            else\n";
        output_stream << "            {\n";
        output_stream << "                writer.Null();\n";
        output_stream << "            }\n";
        output_stream << "        }\n";
        output_stream << "        else if constexpr (std::is_class_v<Value_type>)\n";
        output_stream << "        {\n";
        output_stream << "            write_object(writer, value);\n";
        output_stream << "        }\n";
        output_stream << "    }\n";
        output_stream << "\n";
        output_stream << "    export template <typename Writer_type, typename Value_type>\n";
        output_stream << "        void write_object(\n";
        output_stream << "            Writer_type& writer,\n";
        output_stream << "            std::pmr::vector<Value_type> const& values\n";
        output_stream << "        )\n";
        output_stream << "    {\n";
        output_stream << "        writer.StartObject();\n";
        output_stream << "\n";
        output_stream << "        writer.Key(\"size\");\n";
        output_stream << "        writer.Uint64(values.size());\n";
        output_stream << "\n";
        output_stream << "        writer.Key(\"elements\");\n";
        output_stream << "        writer.StartArray();\n";
        output_stream << "        for (Value_type const& value : values)\n";
        output_stream << "        {\n";
        output_stream << "            write_value(writer, value);\n";
        output_stream << "        }\n";
        output_stream << "        writer.EndArray(values.size());\n";
        output_stream << "\n";
        output_stream << "        writer.EndObject();\n";
        output_stream << "    }\n";
        output_stream << "\n";
        output_stream << "    export template <typename Writer_type, typename Value_type>\n";
        output_stream << "        void write_optional(\n";
        output_stream << "            Writer_type& writer,\n";
        output_stream << "            char const* const key,\n";
        output_stream << "            std::optional<Value_type> const& value\n";
        output_stream << "        )\n";
        output_stream << "    {\n";
        output_stream << "        if (value.has_value())\n";
        output_stream << "        {\n";
        output_stream << "            writer.Key(key);\n";
        output_stream << "            write_value(writer, value);\n";
        output_stream << "        }\n";
        output_stream << "    }\n";
        output_stream << "\n";
        output_stream << "    export template <typename Writer_type, typename Value_type>\n";
        output_stream << "        void write_optional_object(\n";
        output_stream << "            Writer_type& writer,\n";
        output_stream << "            char const* const key,\n";
        output_stream << "            std::optional<Value_type> const& value\n";
        output_stream << "        )\n";
        output_stream << "    {\n";
        output_stream << "        if (value.has_value())\n";
        output_stream << "        {\n";
        output_stream << "            writer.Key(key);\n";
        output_stream << "            write_object(writer, value.value());\n";
        output_stream << "        }\n";
        output_stream << "    }\n";
        output_stream << "\n";

        std::pmr::unordered_map<std::pmr::string, Enum> const enum_map = create_name_map<Enum>(
            file_types.enums
        );

        std::pmr::unordered_map<std::pmr::string, Struct> struct_map = create_name_map<Struct>(
            file_types.structs
        );

        for (Struct const& struct_type : file_types.structs)
        {
            output_stream << generate_write_struct_json_code(struct_type, enum_map, struct_map, 4);
            output_stream << "\n";
        }

        output_stream << "}\n";
    }

    void generate_json_operators_code(
        std::istream& input_stream,
        std::ostream& output_stream,
        std::string_view const export_module_name,
        std::string_view const namespace_name
    )
    {
        File_types const file_types = identify_file_types(
            input_stream
        );

        output_stream << "module;\n";
        output_stream << '\n';
        output_stream << "#include <istream>\n";
        output_stream << "#include <optional>\n";
        output_stream << "#include <ostream>\n";
        output_stream << "\n";
        output_stream << "#include <rapidjson/istreamwrapper.h>\n";
        output_stream << "#include <rapidjson/ostreamwrapper.h>\n";
        output_stream << "#include <rapidjson/reader.h>\n";
        output_stream << "#include <rapidjson/writer.h>\n";
        output_stream << '\n';
        output_stream << "export module " << export_module_name << ";\n";
        output_stream << '\n';
        output_stream << "import h.core;\n";
        output_stream << "import h.json_serializer;\n";
        output_stream << '\n';
        output_stream << "namespace " << namespace_name << '\n';
        output_stream << "{\n";

        for (Enum const& enum_type : file_types.enums)
        {
            output_stream << "    export std::istream& operator>>(std::istream& input_stream, " << enum_type.name << "& value)\n";
            output_stream << "    {\n";
            output_stream << "        std::pmr::string string;\n";
            output_stream << "        input_stream >> string;\n";
            output_stream << "\n";
            output_stream << "        value = h::json::read_enum<" << enum_type.name << ">(string);\n";
            output_stream << "\n";
            output_stream << "        return input_stream;\n";
            output_stream << "    }\n";
            output_stream << "\n";
            output_stream << "    export std::ostream& operator<<(std::ostream& output_stream, " << enum_type.name << " const value)\n";
            output_stream << "    {\n";
            output_stream << "        output_stream << h::json::write_enum(value);\n";
            output_stream << "\n";
            output_stream << "        return output_stream;\n";
            output_stream << "    }\n";
            output_stream << "\n";
        }

        for (Struct const& struct_type : file_types.structs)
        {
            output_stream << "    export std::istream& operator>>(std::istream& input_stream, " << struct_type.name << "& value)\n";
            output_stream << "    {\n";
            output_stream << "        rapidjson::Reader reader;\n";
            output_stream << "        rapidjson::IStreamWrapper stream_wrapper{ input_stream };\n";
            output_stream << "        std::optional<" << struct_type.name << "> const output = h::json::read<" << struct_type.name << ">(reader, stream_wrapper);\n";
            output_stream << "\n";
            output_stream << "        if (output)\n";
            output_stream << "        {\n";
            output_stream << "            value = std::move(*output);\n";
            output_stream << "        }\n";
            output_stream << "\n";
            output_stream << "        return input_stream;\n";
            output_stream << "    }\n";
            output_stream << "\n";
            output_stream << "    export std::ostream& operator<<(std::ostream& output_stream, " << struct_type.name << " const& value)\n";
            output_stream << "    {\n";
            output_stream << "        rapidjson::OStreamWrapper stream_wrapper{ output_stream };\n";
            output_stream << "        rapidjson::Writer<rapidjson::OStreamWrapper> writer{ stream_wrapper };\n";
            output_stream << "        h::json::write(writer, value);\n";
            output_stream << "\n";
            output_stream << "        return output_stream;\n";
            output_stream << "    }\n";
            output_stream << "\n";
        }

        output_stream << "}\n";
    }

    void generate_json_data(
        std::istream& input_stream,
        std::ostream& output_stream
    )
    {
        File_types const file_types = identify_file_types(
            input_stream
        );

        rapidjson::StringBuffer buffer;
        rapidjson::Writer<rapidjson::StringBuffer> writer{ buffer };

        writer.StartObject();
        {
            {
                writer.Key("enums");

                writer.StartArray();
                for (Enum const& enum_info : file_types.enums)
                {
                    writer.StartObject();
                    {
                        writer.Key("name");
                        writer.String(enum_info.name.c_str());

                        writer.Key("values");
                        writer.StartArray();
                        for (std::pmr::string const& value : enum_info.values)
                        {
                            writer.String(value.c_str());
                        }
                        writer.EndArray();
                    }
                    writer.EndObject();
                }
                writer.EndArray();
            }

            {
                writer.Key("structs");

                writer.StartArray();
                for (Struct const& struct_info : file_types.structs)
                {
                    writer.StartObject();
                    {
                        writer.Key("name");
                        writer.String(struct_info.name.c_str());

                        writer.Key("members");
                        writer.StartArray();
                        for (Member const& member : struct_info.members)
                        {
                            writer.StartObject();
                            {
                                writer.Key("type");
                                writer.StartObject();
                                {
                                    writer.Key("name");
                                    writer.String(member.type.name.c_str());
                                }
                                writer.EndObject();

                                writer.Key("name");
                                writer.String(member.name.c_str());
                            }
                            writer.EndObject();
                        }
                        writer.EndArray();
                    }
                    writer.EndObject();
                }
                writer.EndArray();
            }
        }
        writer.EndObject();

        output_stream << buffer.GetString();
    }

    std::pmr::string join(std::span<std::pmr::string const> const strings, std::string_view const delimiter)
    {
        std::pmr::string output;

        for (unsigned int i = 0; i < strings.size(); ++i)
        {
            output += strings[i];

            if ((i + 1) == strings.size())
            {
                break;
            }

            output += delimiter;
        }

        return output;
    }

    std::pmr::string generate_variant_types_enum_name(std::string_view const parent_type_name, std::span<std::pmr::string const> const variant_type_names)
    {
        if (parent_type_name == "Type_reference")
        {
            return std::pmr::string{ "Type_reference_enum" };
        }
        else if (parent_type_name == "Expression")
        {
            return std::pmr::string{ "Expression_enum" };
        }
        else
        {
            return join(variant_type_names, "_") + "_enum";
        }
    }

    std::pmr::string to_typescript_type(
        Type const& type,
        std::string_view const parent_type_name,
        std::pmr::unordered_map<std::pmr::string, Enum> const& enum_map,
        std::pmr::unordered_map<std::pmr::string, Struct> const& struct_map,
        std::pmr::unordered_map<std::pmr::string, std::pmr::string> const& replace_map,
        bool const intermediate_representation
    )
    {
        {
            auto const location = replace_map.find(type.name);
            if (location != replace_map.end())
            {
                std::pmr::string const& new_type = location->second;
                return to_typescript_type(Type{ .name = new_type.c_str() }, parent_type_name, enum_map, struct_map, replace_map, true);
            }
        }

        if (is_int_type(type) || is_int64_type(type) || is_uint_type(type) || is_uint64_type(type) || is_double_type(type))
        {
            return std::pmr::string{ "number" };
        }
        else if (is_string_type(type))
        {
            return std::pmr::string{ "string" };
        }
        else if (is_bool_type(type))
        {
            return std::pmr::string{ "boolean" };
        }
        else if (is_enum_type(type, enum_map))
        {
            return type.name;
        }
        else if (is_struct_type(type, struct_map))
        {
            return type.name;
        }
        else if (is_vector_type(type))
        {
            std::pmr::string const value_type = get_vector_value_type(type);
            std::pmr::string const typescript_type = to_typescript_type(Type{ .name = value_type }, parent_type_name, enum_map, struct_map, replace_map, intermediate_representation);

            if (intermediate_representation)
            {
                return std::pmr::string(std::format("{}[]", typescript_type));
            }
            else
            {
                return std::pmr::string{ std::format("Vector<{}>", typescript_type) };
            }
        }
        else if (is_variant_type(type))
        {
            std::pmr::vector<std::pmr::string> const variant_type_names = get_variadic_types(
                type.name
            );

            std::pmr::string const variant_type_enum_name = generate_variant_types_enum_name(parent_type_name, variant_type_names);

            std::pmr::string const typescript_variant_type = join(variant_type_names, " | ");

            return std::pmr::string{ std::format("Variant<{}, {}>", variant_type_enum_name, typescript_variant_type) };
        }
        else if (is_optional_type(type))
        {
            std::pmr::string const value_type = get_optional_value_type(type);

            if (intermediate_representation)
            {
                auto const location = replace_map.find(value_type);
                if (location != replace_map.end())
                {
                    std::pmr::string const& new_type = location->second;
                    return to_typescript_type(Type{ .name = new_type }, parent_type_name, enum_map, struct_map, replace_map, true);
                }
                else
                {
                    return to_typescript_type(Type{ .name = value_type }, parent_type_name, enum_map, struct_map, replace_map, true);
                }
            }
            else
            {
                return to_typescript_type(Type{ .name = value_type }, parent_type_name, enum_map, struct_map, replace_map, true);
            }
        }
        else
        {
            throw std::runtime_error{ "Type not handled!" };
        }
    }

    void generate_variant_enums(
        std::ostream& output_stream,
        std::span<Struct const> const struct_infos
    )
    {
        for (Struct const& struct_info : struct_infos)
        {
            for (Member const& member : struct_info.members)
            {
                if (is_variant_type(member.type))
                {
                    std::string_view const variant_string = member.type.name;

                    std::pmr::vector<std::pmr::string> const variant_type_names = get_variadic_types(
                        variant_string
                    );

                    std::pmr::string const variant_type_enum_name = generate_variant_types_enum_name(struct_info.name, variant_type_names);

                    output_stream << "export enum " << variant_type_enum_name << " {\n";
                    {
                        for (std::string_view const name : variant_type_names)
                        {
                            output_stream << std::format("    {} = \"{}\",\n", name, name);
                        }
                    }
                    output_stream << "}\n\n";
                }
            }
        }
    }

    bool is_expression_type(std::string_view const type_name)
    {
        return type_name.starts_with("Expression") || type_name.ends_with("expression");
    }

    bool contains_expressions(std::pmr::string const& type_name, std::pmr::unordered_map<std::pmr::string, Struct> const& struct_map)
    {
        if (type_name != "Statement")
        {
            auto const location = struct_map.find(type_name);
            if (location != struct_map.end())
            {
                Struct const& struct_info = location->second;
                for (Member const& member : struct_info.members)
                {
                    if (is_expression_type(member.type.name))
                    {
                        return true;
                    }
                    else if (is_vector_type(member.type))
                    {
                        std::pmr::string const value_type = get_vector_value_type(member.type);
                        if (is_expression_type(value_type))
                        {
                            return true;
                        }
                    }
                    else if (is_optional_type(member.type))
                    {
                        std::pmr::string const value_type = get_optional_value_type(member.type);
                        if (is_expression_type(value_type))
                        {
                            return true;
                        }
                    }
                }
            }
        }

        return is_expression_type(type_name);
    }

    void generate_typescript_interface(
        std::istream& input_stream,
        std::ostream& output_stream
    )
    {
        File_types const file_types = identify_file_types(
            input_stream
        );


        std::pmr::unordered_map<std::pmr::string, Enum> const enum_map = create_name_map<Enum>(
            file_types.enums
        );

        std::pmr::unordered_map<std::pmr::string, Struct> struct_map = create_name_map<Struct>(
            file_types.structs
        );

        {
            output_stream << "export interface Vector<T> {\n";
            output_stream << "    size: number;\n";
            output_stream << "    elements: T[];\n";
            output_stream << "}\n\n";
        }

        {
            output_stream << "export interface Variant<Type_enum, T> {\n";
            output_stream << "    type: Type_enum;\n";
            output_stream << "    value: T;\n";
            output_stream << "}\n\n";
        }

        for (Enum const& enum_info : file_types.enums)
        {
            output_stream << "export enum " << enum_info.name << " {\n";
            {
                for (std::pmr::string const& value : enum_info.values)
                {
                    output_stream << std::format("    {} = \"{}\",\n", value, value);
                }
            }
            output_stream << "}\n\n";
        }

        generate_variant_enums(output_stream, file_types.structs);

        for (Struct const& struct_info : file_types.structs)
        {
            output_stream << "export interface " << struct_info.name << " {\n";
            {
                for (Member const& member : struct_info.members)
                {
                    output_stream << std::format("    {}{}: {};\n", member.name, is_optional_type(member.type) ? "?" : "", to_typescript_type(member.type, struct_info.name, enum_map, struct_map, {}, false));
                }
            }
            output_stream << "}\n\n";
        }
    }

    void generate_variant_core_to_intermediate_representation(std::ostream& output_stream, Type const& type, std::string_view const parent_type_name, std::pmr::unordered_map<std::pmr::string, Enum> const& enum_map, std::pmr::unordered_map<std::pmr::string, Struct> const& struct_map)
    {
        std::pmr::vector<std::pmr::string> const variant_types = get_variadic_types(type.name);
        std::pmr::string const variant_type_enum_name = generate_variant_types_enum_name(parent_type_name, variant_types);

        output_stream << "    switch (core_value.data.type) {\n";

        for (std::pmr::string const& variant_type : variant_types)
        {
            output_stream << std::format("        case Core.{}.{}: {{\n", variant_type_enum_name, variant_type);
            output_stream << "            return {\n";
            output_stream << "                data: {\n";
            output_stream << "                    type: core_value.data.type,\n";

            if (contains_expressions(variant_type, struct_map))
            {
                output_stream << std::format("                    value: core_to_intermediate_{}(core_value.data.value as Core.{}, statement)\n", to_lowercase(variant_type), variant_type);
            }
            else if (is_enum_type(Type{ .name = variant_type }, enum_map))
            {
                output_stream << std::format("                    value: core_value.data.value as {}\n", variant_type);
            }
            else
            {
                output_stream << std::format("                    value: core_to_intermediate_{}(core_value.data.value as Core.{})\n", to_lowercase(variant_type), variant_type);
            }

            output_stream << "                }\n";
            output_stream << "            };\n";
            output_stream << "        }\n";
        }

        output_stream << "    }\n";
    }

    void generate_variant_intermediate_to_core_representation(std::ostream& output_stream, Type const& type, std::string_view const parent_type_name, std::pmr::unordered_map<std::pmr::string, Enum> const& enum_map)
    {
        std::pmr::vector<std::pmr::string> const variant_types = get_variadic_types(type.name);
        std::pmr::string const variant_type_enum_name = generate_variant_types_enum_name(parent_type_name, variant_types);

        output_stream << "    switch (intermediate_value.data.type) {\n";

        if (variant_type_enum_name == "Expression_enum")
        {
            for (std::pmr::string const& variant_type : variant_types)
            {
                output_stream << std::format("        case {}.{}: {{\n", variant_type_enum_name, variant_type);
                output_stream << std::format("            intermediate_to_core_{}(intermediate_value.data.value as {}, expressions);\n", to_lowercase(variant_type), variant_type);
                output_stream << "            break;\n";
                output_stream << "        }\n";
            }
        }
        else
        {
            for (std::pmr::string const& variant_type : variant_types)
            {
                output_stream << std::format("        case {}.{}: {{\n", variant_type_enum_name, variant_type);
                output_stream << "            return {\n";
                output_stream << "                data: {\n";
                output_stream << "                    type: intermediate_value.data.type,\n";

                if (is_enum_type(Type{ .name = variant_type }, enum_map))
                {
                    output_stream << std::format("                    value: intermediate_value.data.value as {}\n", variant_type);
                }
                else
                {
                    output_stream << std::format("                    value: intermediate_to_core_{}(intermediate_value.data.value as {})\n", to_lowercase(variant_type), variant_type);
                }

                output_stream << "                }\n";
                output_stream << "            };\n";
                output_stream << "        }\n";
            }
        }

        output_stream << "    }\n";
    }

    void generate_typescript_intermediate_representation(
        std::istream& input_stream,
        std::ostream& output_stream
    )
    {
        File_types const file_types = identify_file_types(
            input_stream
        );


        std::pmr::unordered_map<std::pmr::string, Enum> const enum_map = create_name_map<Enum>(
            file_types.enums
        );

        std::pmr::unordered_map<std::pmr::string, Struct> struct_map = create_name_map<Struct>(
            file_types.structs
        );

        char const* const head = R"(
import * as Core from "./Core_interface";

export interface Variant<Type_enum, T> {
    type: Type_enum;
    value: T;
}

export interface Module {
    name: string;
    imports: Import_module_with_alias[];
    declarations: Declaration[];
    comment?: string;
}

export function create_intermediate_representation(core_module: Core.Module): Module {

    const imports = core_module.dependencies.alias_imports.elements.map(value => core_to_intermediate_import_module_with_alias(value));
    const declarations = create_declarations(core_module);

    return {
        name: core_module.name,
        imports: imports,
        declarations: declarations,
        comment: core_module.comment
    };
}

export function create_core_module(module: Module, language_version: Core.Language_version): Core.Module {

    const alias_imports = module.imports.map(value => intermediate_to_core_import_module_with_alias(value));

    const export_alias: Core.Alias_type_declaration[] = [];
    const internal_alias: Core.Alias_type_declaration[] = [];
    const export_enums: Core.Enum_declaration[] = [];
    const internal_enums: Core.Enum_declaration[] = [];
    const export_functions: Core.Function_declaration[] = [];
    const internal_functions: Core.Function_declaration[] = [];
    const export_structs: Core.Struct_declaration[] = [];
    const internal_structs: Core.Struct_declaration[] = [];
    const export_unions: Core.Union_declaration[] = [];
    const internal_unions: Core.Union_declaration[] = [];
    const function_definitions: Core.Function_definition[] = [];

    for (const declaration of module.declarations) {
        switch (declaration.type) {
            case Declaration_type.Alias: {
                const array = declaration.is_export ? export_alias : internal_alias;
                array.push(intermediate_to_core_alias_type_declaration(declaration.value as Alias_type_declaration));
                break;
            }
            case Declaration_type.Enum: {
                const array = declaration.is_export ? export_enums : internal_enums;
                array.push(intermediate_to_core_enum_declaration(declaration.value as Enum_declaration));
                break;
            }
            case Declaration_type.Function: {
                const array = declaration.is_export ? export_functions : internal_functions;
                const function_value = declaration.value as Function;
                array.push(intermediate_to_core_function_declaration(function_value.declaration));
                function_definitions.push(intermediate_to_core_function_definition(function_value.definition));
                break;
            }
            case Declaration_type.Struct: {
                const array = declaration.is_export ? export_structs : internal_structs;
                array.push(intermediate_to_core_struct_declaration(declaration.value as Struct_declaration));
                break;
            }
            case Declaration_type.Union: {
                const array = declaration.is_export ? export_unions : internal_unions;
                array.push(intermediate_to_core_union_declaration(declaration.value as Union_declaration));
                break;
            }
        }
    }

    return {
        language_version: language_version,
        name: module.name,
        dependencies: {
            alias_imports: {
                size: alias_imports.length,
                elements: alias_imports
            }
        },
        export_declarations: {
            alias_type_declarations: {
                size: export_alias.length,
                elements: export_alias
            },
            enum_declarations: {
                size: export_enums.length,
                elements: export_enums
            },
            function_declarations: {
                size: export_functions.length,
                elements: export_functions
            },
            struct_declarations: {
                size: export_structs.length,
                elements: export_structs
            },
            union_declarations: {
                size: export_unions.length,
                elements: export_unions
            }
        },
        internal_declarations: {
            alias_type_declarations: {
                size: internal_alias.length,
                elements: internal_alias
            },
            enum_declarations: {
                size: internal_enums.length,
                elements: internal_enums
            },
            function_declarations: {
                size: internal_functions.length,
                elements: internal_functions
            },
            struct_declarations: {
                size: internal_structs.length,
                elements: internal_structs
            },
            union_declarations: {
                size: internal_unions.length,
                elements: internal_unions
            }
        },
        definitions: {
            function_definitions: {
                size: function_definitions.length,
                elements: function_definitions
            }
        },
        comment: module.comment
    };
}

export enum Declaration_type {
    Alias,
    Enum,
    Function,
    Struct,
    Union
}

export interface Declaration {
    name: string;
    type: Declaration_type;
    is_export: boolean;
    value: Alias_type_declaration | Enum_declaration | Function | Struct_declaration | Union_declaration
}

function create_declarations(module: Core.Module): Declaration[] {

    const declarations: Declaration[] = [
        ...module.export_declarations.alias_type_declarations.elements.map((value, index): Declaration => { return { name: value.name, type: Declaration_type.Alias, is_export: true, value: core_to_intermediate_alias_type_declaration(value) }; }),
        ...module.export_declarations.enum_declarations.elements.map((value, index): Declaration => { return { name: value.name, type: Declaration_type.Enum, is_export: true, value: core_to_intermediate_enum_declaration(value) }; }),
        ...module.export_declarations.function_declarations.elements.map((value, index): Declaration => { return { name: value.name, type: Declaration_type.Function, is_export: true, value: core_to_intermediate_function(module, value) }; }),
        ...module.export_declarations.struct_declarations.elements.map((value, index): Declaration => { return { name: value.name, type: Declaration_type.Struct, is_export: true, value: core_to_intermediate_struct_declaration(value) }; }),
        ...module.export_declarations.union_declarations.elements.map((value, index): Declaration => { return { name: value.name, type: Declaration_type.Union, is_export: true, value: core_to_intermediate_union_declaration(value) }; }),
        ...module.internal_declarations.alias_type_declarations.elements.map((value, index): Declaration => { return { name: value.name, type: Declaration_type.Alias, is_export: false, value: core_to_intermediate_alias_type_declaration(value) }; }),
        ...module.internal_declarations.enum_declarations.elements.map((value, index): Declaration => { return { name: value.name, type: Declaration_type.Enum, is_export: false, value: core_to_intermediate_enum_declaration(value) }; }),
        ...module.internal_declarations.function_declarations.elements.map((value, index): Declaration => { return { name: value.name, type: Declaration_type.Function, is_export: false, value: core_to_intermediate_function(module, value) }; }),
        ...module.internal_declarations.struct_declarations.elements.map((value, index): Declaration => { return { name: value.name, type: Declaration_type.Struct, is_export: false, value: core_to_intermediate_struct_declaration(value) }; }),
        ...module.internal_declarations.union_declarations.elements.map((value, index): Declaration => { return { name: value.name, type: Declaration_type.Union, is_export: true, value: core_to_intermediate_union_declaration(value) }; }),
    ];

    return declarations;
}

export interface Function {
    declaration: Function_declaration;
    definition: Function_definition;
}

function core_to_intermediate_function(module: Core.Module, declaration: Core.Function_declaration): Function {

    const definition_index = module.definitions.function_definitions.elements.findIndex(value => value.name === declaration.name);
    const definition = module.definitions.function_definitions.elements[definition_index];

    const value: Function = {
        declaration: core_to_intermediate_function_declaration(declaration),
        definition: core_to_intermediate_function_definition(definition)
    };

    return value;
}

export interface Statement {
    expression: Expression;
    comment?: string;
    newlines_after?: number;
}

function core_to_intermediate_statement(core_value: Core.Statement): Statement {
    return {
        expression: core_to_intermediate_expression(core_value.expressions.elements[0], core_value),
        comment: core_value.comment,
        newlines_after: core_value.newlines_after
    };
}

function intermediate_to_core_statement(intermediate_value: Statement): Core.Statement {

    const expressions: Core.Expression[] = [];
    intermediate_to_core_expression(intermediate_value.expression, expressions);

    return {
        expressions: {
            size: expressions.length,
            elements: expressions
        },
        comment: intermediate_value.comment,
        newlines_after: intermediate_value.newlines_after
    };
}

)";

        output_stream << head;

        for (Enum const& enum_info : file_types.enums)
        {
            output_stream << "export enum " << enum_info.name << " {\n";
            {
                for (std::pmr::string const& value : enum_info.values)
                {
                    output_stream << std::format("    {} = \"{}\",\n", value, value);
                }
            }
            output_stream << "}\n\n";
        }

        generate_variant_enums(output_stream, file_types.structs);

        std::array<char const*, 6> const struct_ignore_list = {
            "Module",
            "Module_declarations",
            "Module_definitions",
            "Module_dependencies",
            "Statement",
            "Expression_index"
        };

        std::pmr::unordered_map<std::pmr::string, std::pmr::string> const replace_type_map = {
            { "Expression_index", "Expression" }
        };

        for (Struct const& struct_info : file_types.structs)
        {
            if (std::find(struct_ignore_list.begin(), struct_ignore_list.end(), struct_info.name) != struct_ignore_list.end())
            {
                continue;
            }

            output_stream << "export interface " << struct_info.name << " {\n";
            {
                for (Member const& member : struct_info.members)
                {
                    output_stream << std::format("    {}{}: {};\n", member.name, is_optional_type(member.type) ? "?" : "", to_typescript_type(member.type, struct_info.name, enum_map, struct_map, replace_type_map, true));
                }
            }
            output_stream << "}\n\n";

            {
                if (contains_expressions(struct_info.name, struct_map))
                {
                    output_stream << std::format("function core_to_intermediate_{}(core_value: Core.{}, statement: Core.Statement): {} {{\n", to_lowercase(struct_info.name), struct_info.name, struct_info.name);
                }
                else
                {
                    output_stream << std::format("function core_to_intermediate_{}(core_value: Core.{}): {} {{\n", to_lowercase(struct_info.name), struct_info.name, struct_info.name);
                }

                {
                    if (struct_info.members.size() == 1 && is_variant_type(struct_info.members[0].type))
                    {
                        generate_variant_core_to_intermediate_representation(output_stream, struct_info.members[0].type, struct_info.name, enum_map, struct_map);
                    }
                    else
                    {
                        output_stream << "    return {\n";
                        for (Member const& member : struct_info.members)
                        {
                            if (member.type.name == "Expression_index")
                            {
                                output_stream << std::format("        {}: core_to_intermediate_expression(statement.expressions.elements[core_value.{}.expression_index], statement),\n", member.name, member.name);
                            }
                            else if (member.type.name == "std::optional<Expression_index>")
                            {
                                output_stream << std::format("        {}: core_value.{} !== undefined ? core_to_intermediate_expression(statement.expressions.elements[core_value.{}.expression_index], statement) : undefined,\n", member.name, member.name, member.name);
                            }
                            else if (is_vector_type(member.type))
                            {
                                Type const vector_value_type = Type{ .name = get_vector_value_type(member.type) };
                                if (vector_value_type.name == "Expression_index")
                                {
                                    output_stream << std::format("        {}: core_value.{}.elements.map(value => core_to_intermediate_expression(statement.expressions.elements[value.expression_index], statement)),\n", member.name, member.name);
                                }
                                else if (is_struct_type(vector_value_type, struct_map))
                                {
                                    if (contains_expressions(vector_value_type.name, struct_map))
                                    {
                                        output_stream << std::format("        {}: core_value.{}.elements.map(value => core_to_intermediate_{}(value, statement)),\n", member.name, member.name, to_lowercase(vector_value_type.name));
                                    }
                                    else
                                    {
                                        output_stream << std::format("        {}: core_value.{}.elements.map(value => core_to_intermediate_{}(value)),\n", member.name, member.name, to_lowercase(vector_value_type.name));
                                    }
                                }
                                else
                                {
                                    output_stream << std::format("        {}: core_value.{}.elements,\n", member.name, member.name);
                                }
                            }
                            else if (is_struct_type(member.type, struct_map))
                            {
                                output_stream << std::format("        {}: core_to_intermediate_{}(core_value.{}),\n", member.name, to_lowercase(member.type.name), member.name);
                            }
                            else if (is_optional_type(member.type))
                            {
                                Type const value_type = Type{ get_optional_value_type(member.type) };
                                if (is_struct_type(value_type, struct_map))
                                {
                                    output_stream << std::format("        {}: core_value.{} !== undefined ? core_to_intermediate_{}(core_value.{}) : undefined,\n", member.name, member.name, to_lowercase(value_type.name), member.name);
                                }
                                else
                                {
                                    output_stream << std::format("        {}: core_value.{},\n", member.name, member.name);
                                }
                            }
                            else
                            {
                                output_stream << std::format("        {}: core_value.{},\n", member.name, member.name);
                            }

                        }
                        output_stream << "    };\n";
                    }
                }
                output_stream << "}\n\n";
            }

            {
                if (contains_expressions(struct_info.name, struct_map))
                {
                    std::string const return_type = is_expression_type(struct_info.name) ? "void" : std::format("Core.{}", struct_info.name);
                    output_stream << std::format("function intermediate_to_core_{}(intermediate_value: {}, expressions: Core.Expression[]): {} {{\n", to_lowercase(struct_info.name), struct_info.name, return_type);
                }
                else
                {
                    output_stream << std::format("function intermediate_to_core_{}(intermediate_value: {}): Core.{} {{\n", to_lowercase(struct_info.name), struct_info.name, struct_info.name);
                }

                if (struct_info.members.size() == 1 && is_variant_type(struct_info.members[0].type))
                {
                    generate_variant_intermediate_to_core_representation(output_stream, struct_info.members[0].type, struct_info.name, enum_map);
                }
                else if (contains_expressions(struct_info.name, struct_map))
                {
                    bool const is_expression = is_expression_type(struct_info.name);

                    std::pmr::string const core_value_type = is_expression ? "Expression" : struct_info.name;

                    if (is_expression)
                    {
                        output_stream << "    const index = expressions.length;\n";
                        output_stream << "    expressions.push({} as Core.Expression);\n";
                        output_stream << "    const core_value: Core.Expression = {\n";
                        output_stream << "        data: {\n";
                        output_stream << std::format("            type: Core.Expression_enum.{},\n", struct_info.name);
                        output_stream << "            value: {\n";
                    }
                    else
                    {
                        output_stream << std::format("    const core_value: Core.{} = {{\n", core_value_type);
                    }

                    int const indentation = is_expression ? 8 : 0;

                    for (Member const& member : struct_info.members)
                    {
                        if (member.type.name == "Expression_index")
                        {
                            output_stream << indent(indentation) << std::format("        {}: {{\n", member.name);
                            output_stream << indent(indentation) << "            expression_index: -1\n";
                            output_stream << indent(indentation) << "        },\n";
                        }
                        else if (member.type.name == "std::optional<Expression_index>")
                        {
                            output_stream << indent(indentation) << std::format("        {}: intermediate_value.{} !== undefined ? {{ expression_index: -1 }} : undefined,\n", member.name, member.name);
                        }
                        else if (is_vector_type(member.type) && get_vector_value_type(member.type) == "Expression_index")
                        {
                            output_stream << indent(indentation) << std::format("        {}: {{\n", member.name);
                            output_stream << indent(indentation) << "            size: 0,\n";
                            output_stream << indent(indentation) << "            elements: []\n";
                            output_stream << indent(indentation) << "        }\n";
                        }
                        else if (is_vector_type(member.type))
                        {
                            std::pmr::string const value_type = get_vector_value_type(member.type);
                            output_stream << indent(indentation) << std::format("        {}: {{\n", member.name);
                            output_stream << indent(indentation) << std::format("            size: intermediate_value.{}.length,\n", member.name);

                            if (contains_expressions(value_type, struct_map))
                            {
                                output_stream << indent(indentation) << std::format("            elements: intermediate_value.{}.map(value => intermediate_to_core_{}(value, expressions))\n", member.name, to_lowercase(value_type));
                            }
                            else
                            {
                                output_stream << indent(indentation) << std::format("            elements: intermediate_value.{}.map(value => intermediate_to_core_{}(value))\n", member.name, to_lowercase(value_type));
                            }

                            output_stream << indent(indentation) << "        },\n";
                        }
                        else if (is_struct_type(member.type, struct_map))
                        {
                            output_stream << indent(indentation) << std::format("        {}: intermediate_to_core_{}(intermediate_value.{}),\n", member.name, to_lowercase(member.type.name), member.name);
                        }
                        else
                        {
                            output_stream << indent(indentation) << std::format("        {}: intermediate_value.{},\n", member.name, member.name);
                        }
                    }

                    if (is_expression)
                    {
                        output_stream << "            }\n";
                        output_stream << "        }\n";
                    }
                    output_stream << "    };\n";

                    if (is_expression)
                    {
                        output_stream << "\n    expressions[index] = core_value;\n";
                    }

                    for (Member const& member : struct_info.members)
                    {
                        std::string const core_value_member = is_expression ? std::format("(core_value.data.value as Core.{}).{}", struct_info.name, member.name) : std::format("core_value.{}", member.name);

                        if (member.type.name == "Expression_index")
                        {
                            output_stream << "\n";
                            output_stream << std::format("    {}.expression_index = expressions.length;\n", core_value_member);
                            output_stream << std::format("    intermediate_to_core_expression(intermediate_value.{}, expressions);\n", member.name);
                        }
                        else if (member.type.name == "std::optional<Expression_index>")
                        {
                            output_stream << "\n";
                            output_stream << std::format("    if (intermediate_value.{} !== undefined) {{\n", member.name);
                            output_stream << std::format("        {} = {{ expression_index: expressions.length }};\n", core_value_member);
                            output_stream << std::format("        intermediate_to_core_expression(intermediate_value.{}, expressions);\n", member.name);
                            output_stream << "    }\n";
                        }
                        else if (is_vector_type(member.type) && get_vector_value_type(member.type) == "Expression_index")
                        {
                            output_stream << "\n";
                            output_stream << std::format("    for (const element of intermediate_value.{}) {{\n", member.name);
                            output_stream << std::format("        {}.elements.push({{ expression_index: expressions.length }});\n", core_value_member);
                            output_stream << "        intermediate_to_core_expression(element, expressions);\n";
                            output_stream << "    }\n";
                            output_stream << std::format("    {}.size = {}.elements.length;\n", core_value_member, core_value_member);
                        }
                    }

                    if (!is_expression)
                    {
                        output_stream << "\n    return core_value;\n";
                    }
                }
                else
                {
                    output_stream << "    return {\n";
                    for (Member const& member : struct_info.members)
                    {
                        if (is_vector_type(member.type))
                        {
                            Type const vector_value_type = Type{ .name = get_vector_value_type(member.type) };
                            if (vector_value_type.name == "Expression_index")
                            {
                                output_stream << std::format("                {}: {{\n", member.name);
                                output_stream << "                    size: 0,\n";
                                output_stream << "                    elements: []\n";
                                output_stream << "                }\n";
                            }
                            else if (is_struct_type(vector_value_type, struct_map))
                            {
                                output_stream << std::format("        {}: {{\n", member.name);
                                output_stream << std::format("            size: intermediate_value.{}.length,\n", member.name);
                                output_stream << std::format("            elements: intermediate_value.{}.map(value => intermediate_to_core_{}(value)),\n", member.name, to_lowercase(vector_value_type.name));
                                output_stream << "        },\n";
                            }
                            else
                            {
                                output_stream << std::format("        {}: {{\n", member.name);
                                output_stream << std::format("            size: intermediate_value.{}.length,\n", member.name);
                                output_stream << std::format("            elements: intermediate_value.{},\n", member.name);
                                output_stream << "        },\n";
                            }
                        }
                        else if (member.type.name == "Expression_index")
                        {
                            output_stream << std::format("                {}: {{\n", member.name);
                            output_stream << "                    expression_index: -1\n";
                            output_stream << "                },\n";
                        }
                        else if (is_struct_type(member.type, struct_map))
                        {
                            output_stream << std::format("        {}: intermediate_to_core_{}(intermediate_value.{}),\n", member.name, to_lowercase(member.type.name), member.name);
                        }
                        else if (is_optional_type(member.type))
                        {
                            Type const value_type = Type{ get_optional_value_type(member.type) };
                            if (is_struct_type(value_type, struct_map))
                            {
                                output_stream << std::format("        {}: intermediate_value.{} !== undefined ? intermediate_to_core_{}(intermediate_value.{}) : undefined,\n", member.name, member.name, to_lowercase(value_type.name), member.name);
                            }
                            else
                            {
                                output_stream << std::format("        {}: intermediate_value.{},\n", member.name, member.name);
                            }
                        }
                        else
                        {
                            output_stream << std::format("        {}: intermediate_value.{},\n", member.name, member.name);
                        }

                    }
                    output_stream << "    };\n";
                }

                output_stream << "}\n\n";
            }

            if (is_expression_type(struct_info.name) && struct_info.name != "Expression")
            {
                auto const replace_by_valid_name = [](std::pmr::string const& name) -> std::pmr::string
                {
                    if (name == "arguments")
                        return "args";

                    return name;
                };

                output_stream << std::format("export function create_{}(", to_lowercase(struct_info.name));
                for (std::size_t member_index = 0; member_index < struct_info.members.size(); ++member_index)
                {
                    Member const& member = struct_info.members[member_index];

                    std::pmr::string const transformed_member_type = to_typescript_type(member.type, struct_info.name, enum_map, struct_map, replace_type_map, true);
                    output_stream << std::format("{}: {}{}", replace_by_valid_name(member.name), transformed_member_type, is_optional_type(member.type) ? " | undefined" : "");

                    if ((member_index + 1) < struct_info.members.size())
                        output_stream << ", ";
                }
                output_stream << "): Expression {\n";
                output_stream << std::format("    const {}: {} = {{\n", to_lowercase(struct_info.name), struct_info.name);
                for (std::size_t member_index = 0; member_index < struct_info.members.size(); ++member_index)
                {
                    Member const& member = struct_info.members[member_index];
                    output_stream << std::format("        {}: {},\n", member.name, replace_by_valid_name(member.name));
                }
                output_stream << "    };\n";
                output_stream << "    return {\n";
                output_stream << "        data: {\n";
                output_stream << std::format("            type: Expression_enum.{},\n", struct_info.name);
                output_stream << std::format("            value: {}\n", to_lowercase(struct_info.name));
                output_stream << "        }\n";
                output_stream << "    };\n";
                output_stream << "}\n";
            }
        }
    }
}
