module;

#include <algorithm>
#include <cctype>
#include <format>
#include <istream>
#include <optional>
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
        Enum const enum_type
    )
    {
        std::stringstream output_stream;

        output_stream << "export template<>\n";
        output_stream << "bool read_enum(" << enum_type.name << "& output, std::string_view const value)\n";
        output_stream << "{\n";

        if (!enum_type.values.empty())
        {
            std::string_view const value = enum_type.values[0];
            output_stream << "    if (value == \"" << to_lowercase(value) << "\")\n";
            output_stream << "    {\n";
            output_stream << "        output = " << enum_type.name << "::" << value << ";\n";
            output_stream << "        return true;\n";
            output_stream << "    }\n";
        }

        for (std::size_t index = 1; index < enum_type.values.size(); ++index)
        {
            std::string_view const value = enum_type.values[index];
            output_stream << "else if (value == \"" << to_lowercase(value) << "\")\n";
            output_stream << "{\n";
            output_stream << "    output = " << enum_type.name << "::" << value << ";\n";
            output_stream << "    return true;\n";
            output_stream << "}\n";
        }
        output_stream << "\n";
        output_stream << "    std::cerr << std::format(\"Failed to read enum '" << enum_type.name << "' with value '{}'\\n\", value);\n";
        output_stream << "    return false;\n";
        output_stream << "}\n";

        return std::pmr::string{ output_stream.str() };
    }

    std::pmr::string generate_write_enum_json_code(
        Enum enum_type
    )
    {
        std::stringstream output_stream;

        output_stream << "export std::string_view write_enum(" << enum_type.name << " const value)\n";
        output_stream << "{\n";

        if (!enum_type.values.empty())
        {
            std::string_view const value = enum_type.values[0];
            output_stream << "    if (value == " << enum_type.name << "::" << value << ")\n";
            output_stream << "    {\n";
            output_stream << "        return \"" << to_lowercase(value) << "\";\n";
            output_stream << "    }\n";
        }

        for (std::size_t index = 1; index < enum_type.values.size(); ++index)
        {
            std::string_view const value = enum_type.values[index];
            output_stream << "    else if (value == " << enum_type.name << "::" << value << ")\n";
            output_stream << "    {\n";
            output_stream << "        return \"" << to_lowercase(value) << "\";\n";
            output_stream << "    }\n";
        }
        output_stream << "    \n";
        output_stream << "    throw std::runtime_error{\"Failed to write enum '" << enum_type.name << "'!\\n\"};\n";
        output_stream << "}\n";

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

        int generate_read_struct_member_key_code(
            std::stringstream& output_stream,
            std::string_view const struct_name,
            Member const& member,
            int const state,
            std::pmr::unordered_map<std::pmr::string, Struct> const& struct_types
        )
        {
            if (is_variant_type(member.type))
            {
                output_stream << "if (event_data == \"data\")\n";
                output_stream << "{\n";
                output_stream << "    state = " << state << ";\n";
                output_stream << "    return true;\n";
                output_stream << "}\n";
                return 1;
            }
            else
            {
                output_stream << "if (event_data == \"" << member.name << "\")\n";
                output_stream << "{\n";
                output_stream << "    state = " << state << ";\n";
                output_stream << "    return true;\n";
                output_stream << "}\n";

                return ((is_struct_type(member.type, struct_types) || is_vector_type(member.type)) ? 2 : 1);
            }
        }

        void generate_read_object_code(
            std::stringstream& output_stream,
            std::string_view const output_name,
            int const state,
            int const end_state,
            int const stack_offset
        )
        {
            output_stream << "case " << state << ":\n";
            output_stream << "{\n";
            output_stream << "    state = " << (state + 1) << ";\n";
            output_stream << "    return read_object(" << output_name << ", event, event_data, state_stack, state_stack_position + 1 + " << stack_offset << ");\n";
            output_stream << "}\n";
            output_stream << "case " << (state + 1) << ":\n";
            output_stream << "{\n";
            output_stream << "    if ((event == Event::End_object) && (state_stack_position + 2 + " << stack_offset << " == state_stack.size()))\n";
            output_stream << "    {\n";
            output_stream << "        if (!read_object(" << output_name << ", event, event_data, state_stack, state_stack_position + 1 + " << stack_offset << "))\n";
            output_stream << "        {\n";
            output_stream << "            return false;\n";
            output_stream << "        }\n";
            output_stream << "        \n";
            output_stream << "        state = " << end_state << ";\n";
            output_stream << "        return true;\n";
            output_stream << "    }\n";
            output_stream << "    else\n";
            output_stream << "    {\n";
            output_stream << "        return read_object(" << output_name << ", event, event_data, state_stack, state_stack_position + 1 + " << stack_offset << ");\n";
            output_stream << "    }\n";
            output_stream << "}\n";
        }

        int generate_read_struct_member_value_code(
            std::stringstream& output_stream,
            std::string_view const struct_name,
            Member const& member,
            int const state,
            std::pmr::unordered_map<std::pmr::string, Enum> const& enum_types,
            std::pmr::unordered_map<std::pmr::string, Struct> const& struct_types
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
                    0
                );

                return 2;
            }
            else if (is_enum_type(member.type, enum_types))
            {
                output_stream << "case " << state << ":\n";
                output_stream << "{\n";
                output_stream << "    state = 1;\n";
                output_stream << "    return read_enum(output." << member.name << ", event_data);\n";
                output_stream << "}\n";

                return 1;
            }
            else if (is_variant_type(member.type))
            {
                std::pmr::vector<std::pmr::string> const variadic_types = get_variadic_types(member.type.name);

                {
                    output_stream << "case " << state << ":\n";
                    output_stream << "{\n";
                    output_stream << "    if (event == Event::Start_object)\n";
                    output_stream << "    {\n";
                    output_stream << "        state = " << (state + 2) << ";\n";
                    output_stream << "        return true;\n";
                    output_stream << "    }\n";
                    output_stream << "}\n";
                }

                const int end_object_state = (state + 1);
                {
                    output_stream << "case " << end_object_state << ":\n";
                    output_stream << "{\n";
                    output_stream << "    if (event == Event::End_object)\n";
                    output_stream << "    {\n";
                    output_stream << "        state = 1;\n";
                    output_stream << "        return true;\n";
                    output_stream << "    }\n";
                    output_stream << "}\n";
                }

                {
                    output_stream << "case " << (state + 2) << ":\n";
                    output_stream << "{\n";
                    output_stream << "    if constexpr (std::is_same_v<Event_data, std::string_view>)\n";
                    output_stream << "    {\n";
                    output_stream << "        if (event == Event::Key && event_data == \"type\")\n";
                    output_stream << "        {\n";
                    output_stream << "            state = " << (state + 3) << ";\n";
                    output_stream << "            return true;\n";
                    output_stream << "        }\n";
                    output_stream << "    }\n";
                    output_stream << "}\n";
                }

                {
                    output_stream << "case " << (state + 3) << ":\n";
                    output_stream << "{\n";
                    {
                        output_stream << "if constexpr (std::is_same_v<Event_data, std::string_view>)\n";
                        output_stream << "{\n";

                        for (std::size_t index = 0; index < variadic_types.size(); ++index)
                        {
                            std::string_view const type_name = variadic_types[index];
                            const int next_state = (state + 4 + 3 * index);

                            output_stream << "if (event_data == \"" << to_lowercase(type_name) << "\")\n";
                            output_stream << "{\n";
                            output_stream << "    output.data = " << type_name << "{};\n";
                            output_stream << "    state = " << next_state << ";\n";
                            output_stream << "    return true;\n";
                            output_stream << "}\n";

                            if ((index + 1) != variadic_types.size())
                            {
                                output_stream << "else ";
                            }
                        }

                        output_stream << "}\n";
                    }
                    output_stream << "}\n";
                }

                for (std::size_t index = 0; index < variadic_types.size(); ++index)
                {
                    const int current_state = (state + 4 + 3 * index);
                    std::string_view const type_name = variadic_types[index];
                    Type const type = { .name = std::pmr::string{type_name} };

                    std::pmr::string const output_name = "std::get<" + std::pmr::string{ type_name } + ">(output." + member.name + ")";

                    output_stream << "case " << current_state << ":\n";
                    output_stream << "{\n";
                    output_stream << "    if constexpr (std::is_same_v<Event_data, std::string_view>)\n";
                    output_stream << "    {\n";
                    output_stream << "        if (event == Event::Key && event_data == \"value\")\n";
                    output_stream << "        {\n";
                    output_stream << "            state = " << (current_state + 1) << ";\n";
                    output_stream << "            return true;\n";
                    output_stream << "        }\n";
                    output_stream << "    }\n";
                    output_stream << "}\n";

                    if (is_enum_type(type, enum_types))
                    {
                        output_stream << "case " << (current_state + 1) << ":\n";
                        output_stream << "{\n";
                        output_stream << "    state = " << end_object_state << ";\n";
                        output_stream << "    return read_enum(" << output_name << ", event_data);\n";
                        output_stream << "}\n";
                    }
                    else if (is_struct_type(type, struct_types))
                    {
                        generate_read_object_code(
                            output_stream,
                            output_name,
                            current_state + 1,
                            end_object_state,
                            1
                        );
                    }
                    else
                    {
                        output_stream << "case " << (current_state + 1) << ":\n";
                        output_stream << "{\n";
                        output_stream << "    state = " << end_object_state << ";\n";
                        output_stream << "    return read_value(" << output_name << ", \"" << member.name << "\", event_data);\n";
                        output_stream << "}\n";
                    }
                }

                return 4 + 3 * static_cast<int>(variadic_types.size());
            }
            else
            {
                output_stream << "case " << state << ":\n";
                output_stream << "{\n";
                output_stream << "    state = 1;\n";
                output_stream << "    return read_value(output." << member.name << ", \"" << member.name << "\", event_data);\n";
                output_stream << "}\n";

                return 1;
            }
        }
    }

    std::pmr::string generate_read_struct_json_code(
        Struct const& struct_type,
        std::pmr::unordered_map<std::pmr::string, Enum> const& enum_types,
        std::pmr::unordered_map<std::pmr::string, Struct> const& struct_types
    )
    {
        std::stringstream output_stream;

        output_stream << "export template<typename Event_data>\n";
        output_stream << "bool read_object(\n";
        output_stream << "    " << struct_type.name << "& output,\n";
        output_stream << "    Event const event,\n";
        output_stream << "    Event_data const event_data,\n";
        output_stream << "    std::pmr::vector<int>& state_stack,\n";
        output_stream << "    std::size_t const state_stack_position\n";
        output_stream << ")\n";
        output_stream << "{\n";
        output_stream << "    if (state_stack_position >= state_stack.size())\n";
        output_stream << "    {\n";
        output_stream << "        return false;\n";
        output_stream << "    }\n";
        output_stream << "    \n";
        output_stream << "    int& state = state_stack[state_stack_position];\n";
        output_stream << "\n";
        output_stream << "    switch (state)\n";
        output_stream << "    {\n";
        output_stream << "    case 0:\n";
        output_stream << "    {\n";
        output_stream << "        if (event == Event::Start_object)\n";
        output_stream << "        {\n";
        output_stream << "            state = 1;\n";
        output_stream << "            return true;\n";
        output_stream << "        }\n";
        output_stream << "        break;\n";
        output_stream << "    }\n";
        output_stream << "    case 1:\n";
        output_stream << "    {\n";
        output_stream << "        switch (event)\n";
        output_stream << "        {\n";
        output_stream << "        case Event::Key:\n";
        output_stream << "        {\n";
        output_stream << "            if constexpr (std::is_same_v<Event_data, std::string_view>)\n";
        output_stream << "            {\n";

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
                    struct_types
                );

                current_state += state_count;
            }

            for (std::size_t member_index = 1; member_index < struct_type.members.size(); ++member_index)
            {
                Member const& member = struct_type.members[member_index];

                output_stream << "else ";

                int const state_count = generate_read_struct_member_key_code(
                    output_stream,
                    struct_type.name,
                    member,
                    current_state,
                    struct_types
                );

                current_state += state_count;
            }
        }

        output_stream << "            }\n";
        output_stream << "            break;\n";
        output_stream << "        }\n";
        output_stream << "        case Event::End_object:\n";
        output_stream << "        {\n";
        output_stream << "            state = 2;\n";
        output_stream << "            return true;\n";
        output_stream << "        }\n";
        output_stream << "        }\n";
        output_stream << "        break;\n";
        output_stream << "    }\n";
        output_stream << "    case 2:\n";
        output_stream << "    {\n";
        output_stream << "        std::cerr << \"While parsing '" << struct_type.name << "' unexpected '}' found.\\n\";\n";
        output_stream << "        return false;\n";
        output_stream << "    }\n";

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
                    struct_types
                );

                current_state += state_count;
            }
        }

        output_stream << "    }\n";
        output_stream << "    \n";
        output_stream << "    std::cerr << \"Error while reading '" << struct_type.name << "'.\\n\";\n";
        output_stream << "    return false;\n";
        output_stream << "}\n";

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
        std::pmr::unordered_map<std::pmr::string, Struct> const& struct_types
    )
    {
        std::stringstream output_stream;

        output_stream << "export template<typename Writer_type>\n";
        output_stream << "void write_object(\n";
        output_stream << "    Writer_type& writer,\n";
        output_stream << "    " << struct_type.name << " const& output\n";
        output_stream << ")\n";
        output_stream << "{\n";
        output_stream << "    writer.StartObject();\n";

        for (Member const& member : struct_type.members)
        {
            if (is_variant_type(member.type))
            {
                output_stream << "    writer.Key(\"data\");\n";
                output_stream << "\n";
                output_stream << "    writer.StartObject();\n";

                std::pmr::vector<std::pmr::string> const type_names = get_variadic_types(
                    member.type.name
                );

                for (std::size_t index = 0; index < type_names.size(); ++index)
                {
                    std::pmr::string const& type_name = type_names[index];
                    Type const underlying_type = { .name = type_name };

                    output_stream << "    ";
                    if (index != 0)
                    {
                        output_stream << "else ";
                    }
                    output_stream << "if (std::holds_alternative<" << type_name << ">(output." << member.name << "))\n";
                    output_stream << "    {\n";
                    output_stream << "        writer.Key(\"type\");\n";
                    output_stream << "        writer.String(\"" << to_lowercase(type_name) << "\");\n";
                    output_stream << "        writer.Key(\"value\");\n";

                    if (is_enum_type(underlying_type, enum_types))
                    {
                        output_stream << "        {\n";
                        output_stream << "            " << type_name << " const& value = std::get<" << type_name << ">(output." << member.name << ");\n";
                        output_stream << "            std::string_view const enum_value_string = write_enum(value);\n";
                        output_stream << "            writer.String(enum_value_string.data(), enum_value_string.size());\n";
                        output_stream << "        }\n";
                    }
                    else if (is_struct_type(underlying_type, struct_types))
                    {
                        output_stream << "        " << type_name << " const& value = std::get<" << type_name << ">(output." << member.name << ");\n";
                        output_stream << "        write_object(writer, value);\n";
                    }
                    else
                    {
                        output_stream << "        " << type_name << " const& value = std::get<" << type_name << ">(output." << member.name << ");\n";
                        output_stream << "        ";
                        generate_write_value_json_code(output_stream, underlying_type, "value");
                        output_stream << '\n';
                    }

                    output_stream << "    }\n";
                }

                output_stream << "    writer.EndObject();\n\n";
            }
            else
            {
                output_stream << "    writer.Key(\"" << member.name << "\");\n";

                if (is_struct_type(member.type, struct_types) || is_vector_type(member.type))
                {
                    output_stream << "    write_object(writer, output." << member.name << ");\n";
                }
                else if (is_enum_type(member.type, enum_types))
                {
                    output_stream << "    {\n";
                    output_stream << "        std::string_view const enum_value_string = write_enum(output." << member.name << ");\n";
                    output_stream << "        writer.String(enum_value_string.data(), enum_value_string.size());\n";
                    output_stream << "    }\n";
                }
                else
                {
                    output_stream << "    ";
                    std::pmr::string const name = "output." + member.name;
                    generate_write_value_json_code(output_stream, member.type, name);
                    output_stream << '\n';
                }
            }
        }

        output_stream << "    writer.EndObject();\n";
        output_stream << "}\n";

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
            std::span<Struct const> const structs
        )
        {
            for (Struct const struct_type : structs)
            {
                output_stream << "export template<typename Writer_type>\n";
                output_stream << "void write_object(\n";
                output_stream << "    Writer_type& writer,\n";
                output_stream << "    " << struct_type.name << " const& input\n";
                output_stream << ");\n";
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

        output_stream << "module;\n";
        output_stream << '\n';
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
        output_stream << "    \n";
        output_stream << "    export struct No_event_data\n";
        output_stream << "    {\n";
        output_stream << "    };\n";
        output_stream << "    \n";
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
        output_stream << "    \n";
        output_stream << "    template<typename Object_type, typename Event_data>\n";
        output_stream << "    bool read_object(\n";
        output_stream << "        Object_type& output,\n";
        output_stream << "        Event const event,\n";
        output_stream << "        Event_data const event_data,\n";
        output_stream << "        std::pmr::vector<int>& state_stack,\n";
        output_stream << "        std::size_t const state_stack_position\n";
        output_stream << "    );\n";
        output_stream << "    \n";
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
        output_stream << "        \n";
        output_stream << "        int& state = state_stack[state_stack_position];\n";
        output_stream << "        \n";
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
        output_stream << "                    \n";
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
        output_stream << "    \n";
        output_stream << "        return false;\n";
        output_stream << "    }\n";
        output_stream << "    \n";
        output_stream << "    export template<typename Enum_type, typename Event_value>\n";
        output_stream << "    bool read_enum(Enum_type & output, Event_value const value)\n";
        output_stream << "    {\n";
        output_stream << "        return false;\n";
        output_stream << "    };\n";
        output_stream << "    \n";

        for (Enum const& enum_type : file_types.enums)
        {
            output_stream << generate_read_enum_json_code(enum_type);
            output_stream << "\n";
        }

        output_stream << "    \n";
        output_stream << "    export template<typename Object_type, typename Event_data>\n";
        output_stream << "    bool read_object(\n";
        output_stream << "        Object_type& output,\n";
        output_stream << "        Event const event,\n";
        output_stream << "        Event_data const event_data,\n";
        output_stream << "        std::pmr::vector<int>& state_stack,\n";
        output_stream << "        std::size_t const state_stack_position\n";
        output_stream << "    );\n";
        output_stream << "    \n";

        std::pmr::unordered_map<std::pmr::string, Enum> const enum_map = create_name_map<Enum>(
            file_types.enums
            );

        std::pmr::unordered_map<std::pmr::string, Struct> struct_map = create_name_map<Struct>(
            file_types.structs
            );

        for (Struct const& struct_type : file_types.structs)
        {
            output_stream << generate_read_struct_json_code(struct_type, enum_map, struct_map);
            output_stream << "\n";
        }

        output_stream << "}\n";
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
            output_stream << generate_write_enum_json_code(enum_type);
            output_stream << "\n";
        }

        generate_write_forward_declarations(output_stream, file_types.structs);

        output_stream << "    export template <typename Writer_type, typename Value_type>\n";
        output_stream << "        void write_object(\n";
        output_stream << "            Writer_type & writer,\n";
        output_stream << "            std::pmr::vector<Value_type> const& values\n";
        output_stream << "        )\n";
        output_stream << "    {\n";
        output_stream << "        writer.StartObject();\n";
        output_stream << "        \n";
        output_stream << "        writer.Key(\"size\");\n";
        output_stream << "        writer.Uint64(values.size());\n";
        output_stream << "        \n";
        output_stream << "        writer.Key(\"elements\");\n";
        output_stream << "        writer.StartArray();\n";
        output_stream << "        for (Value_type const& value : values)\n";
        output_stream << "        {\n";
        output_stream << "            if constexpr (std::is_unsigned_v<Value_type> && sizeof(Value_type) <= 4)\n";
        output_stream << "            {\n";
        output_stream << "                writer.Uint(value);\n";
        output_stream << "            }\n";
        output_stream << "            else if constexpr (std::is_unsigned_v<Value_type>)\n";
        output_stream << "            {\n";
        output_stream << "                writer.Uint64(value);\n";
        output_stream << "            }\n";
        output_stream << "            else if constexpr (std::is_signed_v<Value_type> && sizeof(Value_type) <= 4)\n";
        output_stream << "            {\n";
        output_stream << "                writer.Int(value);\n";
        output_stream << "            }\n";
        output_stream << "            else if constexpr (std::is_signed_v<Value_type>)\n";
        output_stream << "            {\n";
        output_stream << "                writer.Int64(value);\n";
        output_stream << "            }\n";
        output_stream << "            else if constexpr (std::is_floating_point_v<Value_type>)\n";
        output_stream << "            {\n";
        output_stream << "                writer.Double(value);\n";
        output_stream << "            }\n";
        output_stream << "            else if constexpr (std::is_same_v<Value_type, std::string> || std::is_same_v<Value_type, std::pmr::string> || std::is_same_v<Value_type, std::string_view>)\n";
        output_stream << "            {\n";
        output_stream << "                writer.String(value.data(), value.size());\n";
        output_stream << "            }\n";
        output_stream << "            else if constexpr (std::is_enum_v<Value_type>)\n";
        output_stream << "            {\n";
        output_stream << "                {\n";
        output_stream << "                    std::string_view const enum_value_string = write_enum(value);\n";
        output_stream << "                    writer.String(enum_value_string.data(), enum_value_string.size());\n";
        output_stream << "                }\n";
        output_stream << "            }\n";
        output_stream << "            else if constexpr (std::is_class_v<Value_type>)\n";
        output_stream << "            {\n";
        output_stream << "                write_object(writer, value);\n";
        output_stream << "            }\n";
        output_stream << "        }\n";
        output_stream << "        writer.EndArray(values.size());\n";
        output_stream << "        \n";
        output_stream << "        writer.EndObject();\n";
        output_stream << "    }\n";
        output_stream << "    \n";

        std::pmr::unordered_map<std::pmr::string, Enum> const enum_map = create_name_map<Enum>(
            file_types.enums
            );

        std::pmr::unordered_map<std::pmr::string, Struct> struct_map = create_name_map<Struct>(
            file_types.structs
            );

        for (Struct const& struct_type : file_types.structs)
        {
            output_stream << generate_write_struct_json_code(struct_type, enum_map, struct_map);
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
            output_stream << "        \n";
            output_stream << "        value = h::json::read_enum<" << enum_type.name << ">(string);\n";
            output_stream << "        \n";
            output_stream << "        return input_stream;\n";
            output_stream << "    }\n";
            output_stream << "    \n";
            output_stream << "    export std::ostream& operator<<(std::ostream& output_stream, " << enum_type.name << " const value)\n";
            output_stream << "    {\n";
            output_stream << "        output_stream << h::json::write_enum(value);\n";
            output_stream << "        \n";
            output_stream << "        return output_stream;\n";
            output_stream << "    }\n";
            output_stream << "    \n";
        }

        for (Struct const& struct_type : file_types.structs)
        {
            output_stream << "    export std::istream& operator>>(std::istream& input_stream, " << struct_type.name << "& value)\n";
            output_stream << "    {\n";
            output_stream << "        rapidjson::Reader reader;\n";
            output_stream << "        rapidjson::IStreamWrapper stream_wrapper{ input_stream };\n";
            output_stream << "        std::optional<" << struct_type.name << "> const output = h::json::read<" << struct_type.name << ">(reader, stream_wrapper);\n";
            output_stream << "        \n";
            output_stream << "        if (output)\n";
            output_stream << "        {\n";
            output_stream << "            value = std::move(*output);\n";
            output_stream << "        }\n";
            output_stream << "        \n";
            output_stream << "        return input_stream;\n";
            output_stream << "    }\n";
            output_stream << "    \n";
            output_stream << "    export std::ostream& operator<<(std::ostream& output_stream, " << struct_type.name << " const& value)\n";
            output_stream << "    {\n";
            output_stream << "        rapidjson::OStreamWrapper stream_wrapper{ output_stream };\n";
            output_stream << "        rapidjson::Writer<rapidjson::OStreamWrapper> writer{ stream_wrapper };\n";
            output_stream << "        h::json::write(writer, value);\n";
            output_stream << "        \n";
            output_stream << "        return output_stream;\n";
            output_stream << "    }\n";
            output_stream << "    \n";
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
}
