module;

#include <iostream>
#include <memory_resource>
#include <string_view>
#include <variant>
#include <vector>

export module h.json_serializer.write_json;

import h.core;

namespace h::json
{
    export std::string_view write_enum(Fundamental_type const value)
    {
        if (value == Fundamental_type::Bool)
        {
            return "Bool";
        }
        else if (value == Fundamental_type::Byte)
        {
            return "Byte";
        }
        else if (value == Fundamental_type::Float16)
        {
            return "Float16";
        }
        else if (value == Fundamental_type::Float32)
        {
            return "Float32";
        }
        else if (value == Fundamental_type::Float64)
        {
            return "Float64";
        }
        else if (value == Fundamental_type::String)
        {
            return "String";
        }
        else if (value == Fundamental_type::Any_type)
        {
            return "Any_type";
        }
        else if (value == Fundamental_type::C_bool)
        {
            return "C_bool";
        }
        else if (value == Fundamental_type::C_char)
        {
            return "C_char";
        }
        else if (value == Fundamental_type::C_schar)
        {
            return "C_schar";
        }
        else if (value == Fundamental_type::C_uchar)
        {
            return "C_uchar";
        }
        else if (value == Fundamental_type::C_short)
        {
            return "C_short";
        }
        else if (value == Fundamental_type::C_ushort)
        {
            return "C_ushort";
        }
        else if (value == Fundamental_type::C_int)
        {
            return "C_int";
        }
        else if (value == Fundamental_type::C_uint)
        {
            return "C_uint";
        }
        else if (value == Fundamental_type::C_long)
        {
            return "C_long";
        }
        else if (value == Fundamental_type::C_ulong)
        {
            return "C_ulong";
        }
        else if (value == Fundamental_type::C_longlong)
        {
            return "C_longlong";
        }
        else if (value == Fundamental_type::C_ulonglong)
        {
            return "C_ulonglong";
        }

        throw std::runtime_error{ "Failed to write enum 'Fundamental_type'!\n" };
    }

    export std::string_view write_enum(Binary_operation const value)
    {
        if (value == Binary_operation::Add)
        {
            return "Add";
        }
        else if (value == Binary_operation::Subtract)
        {
            return "Subtract";
        }
        else if (value == Binary_operation::Multiply)
        {
            return "Multiply";
        }
        else if (value == Binary_operation::Signed_divide)
        {
            return "Signed_divide";
        }
        else if (value == Binary_operation::Unsigned_divide)
        {
            return "Unsigned_divide";
        }
        else if (value == Binary_operation::Less_than)
        {
            return "Less_than";
        }

        throw std::runtime_error{ "Failed to write enum 'Binary_operation'!\n" };
    }

    export std::string_view write_enum(Cast_type const value)
    {
        if (value == Cast_type::Numeric)
        {
            return "Numeric";
        }
        else if (value == Cast_type::BitCast)
        {
            return "BitCast";
        }

        throw std::runtime_error{ "Failed to write enum 'Cast_type'!\n" };
    }

    export std::string_view write_enum(Linkage const value)
    {
        if (value == Linkage::External)
        {
            return "External";
        }
        else if (value == Linkage::Private)
        {
            return "Private";
        }

        throw std::runtime_error{ "Failed to write enum 'Linkage'!\n" };
    }

    export template<typename Writer_type>
        void write_object(
            Writer_type& writer,
            Integer_type const& input
        );

    export template<typename Writer_type>
        void write_object(
            Writer_type& writer,
            Builtin_type_reference const& input
        );

    export template<typename Writer_type>
        void write_object(
            Writer_type& writer,
            Function_type const& input
        );

    export template<typename Writer_type>
        void write_object(
            Writer_type& writer,
            Pointer_type const& input
        );

    export template<typename Writer_type>
        void write_object(
            Writer_type& writer,
            Module_reference const& input
        );

    export template<typename Writer_type>
        void write_object(
            Writer_type& writer,
            Constant_array_type const& input
        );

    export template<typename Writer_type>
        void write_object(
            Writer_type& writer,
            Custom_type_reference const& input
        );

    export template<typename Writer_type>
        void write_object(
            Writer_type& writer,
            Type_reference const& input
        );

    export template<typename Writer_type>
        void write_object(
            Writer_type& writer,
            Alias_type_declaration const& input
        );

    export template<typename Writer_type>
        void write_object(
            Writer_type& writer,
            Enum_value const& input
        );

    export template<typename Writer_type>
        void write_object(
            Writer_type& writer,
            Enum_declaration const& input
        );

    export template<typename Writer_type>
        void write_object(
            Writer_type& writer,
            Struct_declaration const& input
        );

    export template<typename Writer_type>
        void write_object(
            Writer_type& writer,
            Variable_expression const& input
        );

    export template<typename Writer_type>
        void write_object(
            Writer_type& writer,
            Expression_index const& input
        );

    export template<typename Writer_type>
        void write_object(
            Writer_type& writer,
            Assignment_expression const& input
        );

    export template<typename Writer_type>
        void write_object(
            Writer_type& writer,
            Binary_expression const& input
        );

    export template<typename Writer_type>
        void write_object(
            Writer_type& writer,
            Call_expression const& input
        );

    export template<typename Writer_type>
        void write_object(
            Writer_type& writer,
            Cast_expression const& input
        );

    export template<typename Writer_type>
        void write_object(
            Writer_type& writer,
            Constant_expression const& input
        );

    export template<typename Writer_type>
        void write_object(
            Writer_type& writer,
            Invalid_expression const& input
        );

    export template<typename Writer_type>
        void write_object(
            Writer_type& writer,
            Return_expression const& input
        );

    export template<typename Writer_type>
        void write_object(
            Writer_type& writer,
            Struct_member_expression const& input
        );

    export template<typename Writer_type>
        void write_object(
            Writer_type& writer,
            Variable_declaration_expression const& input
        );

    export template<typename Writer_type>
        void write_object(
            Writer_type& writer,
            Expression const& input
        );

    export template<typename Writer_type>
        void write_object(
            Writer_type& writer,
            Statement const& input
        );

    export template<typename Writer_type>
        void write_object(
            Writer_type& writer,
            Function_declaration const& input
        );

    export template<typename Writer_type>
        void write_object(
            Writer_type& writer,
            Function_definition const& input
        );

    export template<typename Writer_type>
        void write_object(
            Writer_type& writer,
            Language_version const& input
        );

    export template<typename Writer_type>
        void write_object(
            Writer_type& writer,
            Import_module_with_alias const& input
        );

    export template<typename Writer_type>
        void write_object(
            Writer_type& writer,
            Module_dependencies const& input
        );

    export template<typename Writer_type>
        void write_object(
            Writer_type& writer,
            Module_declarations const& input
        );

    export template<typename Writer_type>
        void write_object(
            Writer_type& writer,
            Module_definitions const& input
        );

    export template<typename Writer_type>
        void write_object(
            Writer_type& writer,
            Module const& input
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
            Integer_type const& output
        )
    {
        writer.StartObject();
        writer.Key("number_of_bits");
        writer.Uint(output.number_of_bits);
        writer.Key("is_signed");
        writer.Bool(output.is_signed);
        writer.EndObject();
    }

    export template<typename Writer_type>
        void write_object(
            Writer_type& writer,
            Builtin_type_reference const& output
        )
    {
        writer.StartObject();
        writer.Key("value");
        writer.String(output.value.data(), output.value.size());
        writer.EndObject();
    }

    export template<typename Writer_type>
        void write_object(
            Writer_type& writer,
            Function_type const& output
        )
    {
        writer.StartObject();
        writer.Key("input_parameter_types");
        write_object(writer, output.input_parameter_types);
        writer.Key("output_parameter_types");
        write_object(writer, output.output_parameter_types);
        writer.Key("is_variadic");
        writer.Bool(output.is_variadic);
        writer.EndObject();
    }

    export template<typename Writer_type>
        void write_object(
            Writer_type& writer,
            Pointer_type const& output
        )
    {
        writer.StartObject();
        writer.Key("element_type");
        write_object(writer, output.element_type);
        writer.Key("is_mutable");
        writer.Bool(output.is_mutable);
        writer.EndObject();
    }

    export template<typename Writer_type>
        void write_object(
            Writer_type& writer,
            Module_reference const& output
        )
    {
        writer.StartObject();
        writer.Key("name");
        writer.String(output.name.data(), output.name.size());
        writer.EndObject();
    }

    export template<typename Writer_type>
        void write_object(
            Writer_type& writer,
            Constant_array_type const& output
        )
    {
        writer.StartObject();
        writer.Key("value_type");
        write_object(writer, output.value_type);
        writer.Key("size");
        writer.Uint64(output.size);
        writer.EndObject();
    }

    export template<typename Writer_type>
        void write_object(
            Writer_type& writer,
            Custom_type_reference const& output
        )
    {
        writer.StartObject();
        writer.Key("module_reference");
        write_object(writer, output.module_reference);
        writer.Key("name");
        writer.String(output.name.data(), output.name.size());
        writer.EndObject();
    }

    export template<typename Writer_type>
        void write_object(
            Writer_type& writer,
            Type_reference const& output
        )
    {
        writer.StartObject();
        writer.Key("data");

        writer.StartObject();
        if (std::holds_alternative<Builtin_type_reference>(output.data))
        {
            writer.Key("type");
            writer.String("Builtin_type_reference");
            writer.Key("value");
            Builtin_type_reference const& value = std::get<Builtin_type_reference>(output.data);
            write_object(writer, value);
        }
        else if (std::holds_alternative<Constant_array_type>(output.data))
        {
            writer.Key("type");
            writer.String("Constant_array_type");
            writer.Key("value");
            Constant_array_type const& value = std::get<Constant_array_type>(output.data);
            write_object(writer, value);
        }
        else if (std::holds_alternative<Custom_type_reference>(output.data))
        {
            writer.Key("type");
            writer.String("Custom_type_reference");
            writer.Key("value");
            Custom_type_reference const& value = std::get<Custom_type_reference>(output.data);
            write_object(writer, value);
        }
        else if (std::holds_alternative<Fundamental_type>(output.data))
        {
            writer.Key("type");
            writer.String("Fundamental_type");
            writer.Key("value");
            {
                Fundamental_type const& value = std::get<Fundamental_type>(output.data);
                std::string_view const enum_value_string = write_enum(value);
                writer.String(enum_value_string.data(), enum_value_string.size());
            }
        }
        else if (std::holds_alternative<Function_type>(output.data))
        {
            writer.Key("type");
            writer.String("Function_type");
            writer.Key("value");
            Function_type const& value = std::get<Function_type>(output.data);
            write_object(writer, value);
        }
        else if (std::holds_alternative<Integer_type>(output.data))
        {
            writer.Key("type");
            writer.String("Integer_type");
            writer.Key("value");
            Integer_type const& value = std::get<Integer_type>(output.data);
            write_object(writer, value);
        }
        else if (std::holds_alternative<Pointer_type>(output.data))
        {
            writer.Key("type");
            writer.String("Pointer_type");
            writer.Key("value");
            Pointer_type const& value = std::get<Pointer_type>(output.data);
            write_object(writer, value);
        }
        writer.EndObject();

        writer.EndObject();
    }

    export template<typename Writer_type>
        void write_object(
            Writer_type& writer,
            Alias_type_declaration const& output
        )
    {
        writer.StartObject();
        writer.Key("name");
        writer.String(output.name.data(), output.name.size());
        writer.Key("type");
        write_object(writer, output.type);
        writer.EndObject();
    }

    export template<typename Writer_type>
        void write_object(
            Writer_type& writer,
            Enum_value const& output
        )
    {
        writer.StartObject();
        writer.Key("name");
        writer.String(output.name.data(), output.name.size());
        writer.Key("value");
        writer.Uint64(output.value);
        writer.EndObject();
    }

    export template<typename Writer_type>
        void write_object(
            Writer_type& writer,
            Enum_declaration const& output
        )
    {
        writer.StartObject();
        writer.Key("name");
        writer.String(output.name.data(), output.name.size());
        writer.Key("values");
        write_object(writer, output.values);
        writer.EndObject();
    }

    export template<typename Writer_type>
        void write_object(
            Writer_type& writer,
            Struct_declaration const& output
        )
    {
        writer.StartObject();
        writer.Key("name");
        writer.String(output.name.data(), output.name.size());
        writer.Key("member_types");
        write_object(writer, output.member_types);
        writer.Key("member_names");
        write_object(writer, output.member_names);
        writer.Key("is_packed");
        writer.Bool(output.is_packed);
        writer.Key("is_literal");
        writer.Bool(output.is_literal);
        writer.EndObject();
    }

    export template<typename Writer_type>
        void write_object(
            Writer_type& writer,
            Variable_expression const& output
        )
    {
        writer.StartObject();
        writer.Key("name");
        writer.String(output.name.data(), output.name.size());
        writer.EndObject();
    }

    export template<typename Writer_type>
        void write_object(
            Writer_type& writer,
            Expression_index const& output
        )
    {
        writer.StartObject();
        writer.Key("expression_index");
        writer.Uint64(output.expression_index);
        writer.EndObject();
    }

    export template<typename Writer_type>
        void write_object(
            Writer_type& writer,
            Assignment_expression const& output
        )
    {
        writer.StartObject();
        writer.Key("left_hand_side");
        write_object(writer, output.left_hand_side);
        writer.Key("right_hand_side");
        write_object(writer, output.right_hand_side);
        writer.EndObject();
    }

    export template<typename Writer_type>
        void write_object(
            Writer_type& writer,
            Binary_expression const& output
        )
    {
        writer.StartObject();
        writer.Key("left_hand_side");
        write_object(writer, output.left_hand_side);
        writer.Key("right_hand_side");
        write_object(writer, output.right_hand_side);
        writer.Key("operation");
        {
            std::string_view const enum_value_string = write_enum(output.operation);
            writer.String(enum_value_string.data(), enum_value_string.size());
        }
        writer.EndObject();
    }

    export template<typename Writer_type>
        void write_object(
            Writer_type& writer,
            Call_expression const& output
        )
    {
        writer.StartObject();
        writer.Key("module_reference");
        write_object(writer, output.module_reference);
        writer.Key("function_name");
        writer.String(output.function_name.data(), output.function_name.size());
        writer.Key("arguments");
        write_object(writer, output.arguments);
        writer.EndObject();
    }

    export template<typename Writer_type>
        void write_object(
            Writer_type& writer,
            Cast_expression const& output
        )
    {
        writer.StartObject();
        writer.Key("source");
        write_object(writer, output.source);
        writer.Key("destination_type");
        write_object(writer, output.destination_type);
        writer.Key("cast_type");
        {
            std::string_view const enum_value_string = write_enum(output.cast_type);
            writer.String(enum_value_string.data(), enum_value_string.size());
        }
        writer.EndObject();
    }

    export template<typename Writer_type>
        void write_object(
            Writer_type& writer,
            Constant_expression const& output
        )
    {
        writer.StartObject();
        writer.Key("type");
        write_object(writer, output.type);
        writer.Key("data");
        writer.String(output.data.data(), output.data.size());
        writer.EndObject();
    }

    export template<typename Writer_type>
        void write_object(
            Writer_type& writer,
            Invalid_expression const& output
        )
    {
        writer.StartObject();
        writer.Key("value");
        writer.String(output.value.data(), output.value.size());
        writer.EndObject();
    }

    export template<typename Writer_type>
        void write_object(
            Writer_type& writer,
            Return_expression const& output
        )
    {
        writer.StartObject();
        writer.Key("expression");
        write_object(writer, output.expression);
        writer.EndObject();
    }

    export template<typename Writer_type>
        void write_object(
            Writer_type& writer,
            Struct_member_expression const& output
        )
    {
        writer.StartObject();
        writer.Key("instance");
        write_object(writer, output.instance);
        writer.Key("member_name");
        writer.String(output.member_name.data(), output.member_name.size());
        writer.EndObject();
    }

    export template<typename Writer_type>
        void write_object(
            Writer_type& writer,
            Variable_declaration_expression const& output
        )
    {
        writer.StartObject();
        writer.Key("name");
        writer.String(output.name.data(), output.name.size());
        writer.Key("is_mutable");
        writer.Bool(output.is_mutable);
        writer.Key("right_hand_side");
        write_object(writer, output.right_hand_side);
        writer.EndObject();
    }

    export template<typename Writer_type>
        void write_object(
            Writer_type& writer,
            Expression const& output
        )
    {
        writer.StartObject();
        writer.Key("data");

        writer.StartObject();
        if (std::holds_alternative<Assignment_expression>(output.data))
        {
            writer.Key("type");
            writer.String("Assignment_expression");
            writer.Key("value");
            Assignment_expression const& value = std::get<Assignment_expression>(output.data);
            write_object(writer, value);
        }
        else if (std::holds_alternative<Binary_expression>(output.data))
        {
            writer.Key("type");
            writer.String("Binary_expression");
            writer.Key("value");
            Binary_expression const& value = std::get<Binary_expression>(output.data);
            write_object(writer, value);
        }
        else if (std::holds_alternative<Call_expression>(output.data))
        {
            writer.Key("type");
            writer.String("Call_expression");
            writer.Key("value");
            Call_expression const& value = std::get<Call_expression>(output.data);
            write_object(writer, value);
        }
        else if (std::holds_alternative<Cast_expression>(output.data))
        {
            writer.Key("type");
            writer.String("Cast_expression");
            writer.Key("value");
            Cast_expression const& value = std::get<Cast_expression>(output.data);
            write_object(writer, value);
        }
        else if (std::holds_alternative<Constant_expression>(output.data))
        {
            writer.Key("type");
            writer.String("Constant_expression");
            writer.Key("value");
            Constant_expression const& value = std::get<Constant_expression>(output.data);
            write_object(writer, value);
        }
        else if (std::holds_alternative<Invalid_expression>(output.data))
        {
            writer.Key("type");
            writer.String("Invalid_expression");
            writer.Key("value");
            Invalid_expression const& value = std::get<Invalid_expression>(output.data);
            write_object(writer, value);
        }
        else if (std::holds_alternative<Return_expression>(output.data))
        {
            writer.Key("type");
            writer.String("Return_expression");
            writer.Key("value");
            Return_expression const& value = std::get<Return_expression>(output.data);
            write_object(writer, value);
        }
        else if (std::holds_alternative<Struct_member_expression>(output.data))
        {
            writer.Key("type");
            writer.String("Struct_member_expression");
            writer.Key("value");
            Struct_member_expression const& value = std::get<Struct_member_expression>(output.data);
            write_object(writer, value);
        }
        else if (std::holds_alternative<Variable_declaration_expression>(output.data))
        {
            writer.Key("type");
            writer.String("Variable_declaration_expression");
            writer.Key("value");
            Variable_declaration_expression const& value = std::get<Variable_declaration_expression>(output.data);
            write_object(writer, value);
        }
        else if (std::holds_alternative<Variable_expression>(output.data))
        {
            writer.Key("type");
            writer.String("Variable_expression");
            writer.Key("value");
            Variable_expression const& value = std::get<Variable_expression>(output.data);
            write_object(writer, value);
        }
        writer.EndObject();

        writer.EndObject();
    }

    export template<typename Writer_type>
        void write_object(
            Writer_type& writer,
            Statement const& output
        )
    {
        writer.StartObject();
        writer.Key("name");
        writer.String(output.name.data(), output.name.size());
        writer.Key("expressions");
        write_object(writer, output.expressions);
        writer.EndObject();
    }

    export template<typename Writer_type>
        void write_object(
            Writer_type& writer,
            Function_declaration const& output
        )
    {
        writer.StartObject();
        writer.Key("name");
        writer.String(output.name.data(), output.name.size());
        writer.Key("type");
        write_object(writer, output.type);
        writer.Key("input_parameter_names");
        write_object(writer, output.input_parameter_names);
        writer.Key("output_parameter_names");
        write_object(writer, output.output_parameter_names);
        writer.Key("linkage");
        {
            std::string_view const enum_value_string = write_enum(output.linkage);
            writer.String(enum_value_string.data(), enum_value_string.size());
        }
        writer.EndObject();
    }

    export template<typename Writer_type>
        void write_object(
            Writer_type& writer,
            Function_definition const& output
        )
    {
        writer.StartObject();
        writer.Key("name");
        writer.String(output.name.data(), output.name.size());
        writer.Key("statements");
        write_object(writer, output.statements);
        writer.EndObject();
    }

    export template<typename Writer_type>
        void write_object(
            Writer_type& writer,
            Language_version const& output
        )
    {
        writer.StartObject();
        writer.Key("major");
        writer.Uint(output.major);
        writer.Key("minor");
        writer.Uint(output.minor);
        writer.Key("patch");
        writer.Uint(output.patch);
        writer.EndObject();
    }

    export template<typename Writer_type>
        void write_object(
            Writer_type& writer,
            Import_module_with_alias const& output
        )
    {
        writer.StartObject();
        writer.Key("module_name");
        writer.String(output.module_name.data(), output.module_name.size());
        writer.Key("alias");
        writer.String(output.alias.data(), output.alias.size());
        writer.Key("usages");
        write_object(writer, output.usages);
        writer.EndObject();
    }

    export template<typename Writer_type>
        void write_object(
            Writer_type& writer,
            Module_dependencies const& output
        )
    {
        writer.StartObject();
        writer.Key("alias_imports");
        write_object(writer, output.alias_imports);
        writer.EndObject();
    }

    export template<typename Writer_type>
        void write_object(
            Writer_type& writer,
            Module_declarations const& output
        )
    {
        writer.StartObject();
        writer.Key("alias_type_declarations");
        write_object(writer, output.alias_type_declarations);
        writer.Key("enum_declarations");
        write_object(writer, output.enum_declarations);
        writer.Key("struct_declarations");
        write_object(writer, output.struct_declarations);
        writer.Key("function_declarations");
        write_object(writer, output.function_declarations);
        writer.EndObject();
    }

    export template<typename Writer_type>
        void write_object(
            Writer_type& writer,
            Module_definitions const& output
        )
    {
        writer.StartObject();
        writer.Key("function_definitions");
        write_object(writer, output.function_definitions);
        writer.EndObject();
    }

    export template<typename Writer_type>
        void write_object(
            Writer_type& writer,
            Module const& output
        )
    {
        writer.StartObject();
        writer.Key("language_version");
        write_object(writer, output.language_version);
        writer.Key("name");
        writer.String(output.name.data(), output.name.size());
        writer.Key("dependencies");
        write_object(writer, output.dependencies);
        writer.Key("export_declarations");
        write_object(writer, output.export_declarations);
        writer.Key("internal_declarations");
        write_object(writer, output.internal_declarations);
        writer.Key("definitions");
        write_object(writer, output.definitions);
        writer.EndObject();
    }

}
