module;

#include <istream>
#include <optional>
#include <ostream>

#include <rapidjson/istreamwrapper.h>
#include <rapidjson/ostreamwrapper.h>
#include <rapidjson/reader.h>
#include <rapidjson/writer.h>

export module h.json_serializer.operators;

import h.core;
import h.json_serializer;

namespace h::json::operators
{
    export std::istream& operator>>(std::istream& input_stream, Fundamental_type& value)
    {
        std::pmr::string string;
        input_stream >> string;

        value = h::json::read_enum<Fundamental_type>(string);

        return input_stream;
    }

    export std::ostream& operator<<(std::ostream& output_stream, Fundamental_type const value)
    {
        output_stream << h::json::write_enum(value);

        return output_stream;
    }

    export std::istream& operator>>(std::istream& input_stream, Variable_expression_type& value)
    {
        std::pmr::string string;
        input_stream >> string;

        value = h::json::read_enum<Variable_expression_type>(string);

        return input_stream;
    }

    export std::ostream& operator<<(std::ostream& output_stream, Variable_expression_type const value)
    {
        output_stream << h::json::write_enum(value);

        return output_stream;
    }

    export std::istream& operator>>(std::istream& input_stream, Binary_operation& value)
    {
        std::pmr::string string;
        input_stream >> string;

        value = h::json::read_enum<Binary_operation>(string);

        return input_stream;
    }

    export std::ostream& operator<<(std::ostream& output_stream, Binary_operation const value)
    {
        output_stream << h::json::write_enum(value);

        return output_stream;
    }

    export std::istream& operator>>(std::istream& input_stream, Linkage& value)
    {
        std::pmr::string string;
        input_stream >> string;

        value = h::json::read_enum<Linkage>(string);

        return input_stream;
    }

    export std::ostream& operator<<(std::ostream& output_stream, Linkage const value)
    {
        output_stream << h::json::write_enum(value);

        return output_stream;
    }

    export std::istream& operator>>(std::istream& input_stream, Integer_type& value)
    {
        rapidjson::Reader reader;
        rapidjson::IStreamWrapper stream_wrapper{ input_stream };
        std::optional<Integer_type> const output = h::json::read<Integer_type>(reader, stream_wrapper);

        if (output)
        {
            value = std::move(*output);
        }

        return input_stream;
    }

    export std::ostream& operator<<(std::ostream& output_stream, Integer_type const& value)
    {
        rapidjson::OStreamWrapper stream_wrapper{ output_stream };
        rapidjson::Writer<rapidjson::OStreamWrapper> writer{ stream_wrapper };
        h::json::write(writer, value);

        return output_stream;
    }

    export std::istream& operator>>(std::istream& input_stream, Builtin_type_reference& value)
    {
        rapidjson::Reader reader;
        rapidjson::IStreamWrapper stream_wrapper{ input_stream };
        std::optional<Builtin_type_reference> const output = h::json::read<Builtin_type_reference>(reader, stream_wrapper);

        if (output)
        {
            value = std::move(*output);
        }

        return input_stream;
    }

    export std::ostream& operator<<(std::ostream& output_stream, Builtin_type_reference const& value)
    {
        rapidjson::OStreamWrapper stream_wrapper{ output_stream };
        rapidjson::Writer<rapidjson::OStreamWrapper> writer{ stream_wrapper };
        h::json::write(writer, value);

        return output_stream;
    }

    export std::istream& operator>>(std::istream& input_stream, Function_type& value)
    {
        rapidjson::Reader reader;
        rapidjson::IStreamWrapper stream_wrapper{ input_stream };
        std::optional<Function_type> const output = h::json::read<Function_type>(reader, stream_wrapper);

        if (output)
        {
            value = std::move(*output);
        }

        return input_stream;
    }

    export std::ostream& operator<<(std::ostream& output_stream, Function_type const& value)
    {
        rapidjson::OStreamWrapper stream_wrapper{ output_stream };
        rapidjson::Writer<rapidjson::OStreamWrapper> writer{ stream_wrapper };
        h::json::write(writer, value);

        return output_stream;
    }

    export std::istream& operator>>(std::istream& input_stream, Pointer_type& value)
    {
        rapidjson::Reader reader;
        rapidjson::IStreamWrapper stream_wrapper{ input_stream };
        std::optional<Pointer_type> const output = h::json::read<Pointer_type>(reader, stream_wrapper);

        if (output)
        {
            value = std::move(*output);
        }

        return input_stream;
    }

    export std::ostream& operator<<(std::ostream& output_stream, Pointer_type const& value)
    {
        rapidjson::OStreamWrapper stream_wrapper{ output_stream };
        rapidjson::Writer<rapidjson::OStreamWrapper> writer{ stream_wrapper };
        h::json::write(writer, value);

        return output_stream;
    }

    export std::istream& operator>>(std::istream& input_stream, Module_reference& value)
    {
        rapidjson::Reader reader;
        rapidjson::IStreamWrapper stream_wrapper{ input_stream };
        std::optional<Module_reference> const output = h::json::read<Module_reference>(reader, stream_wrapper);

        if (output)
        {
            value = std::move(*output);
        }

        return input_stream;
    }

    export std::ostream& operator<<(std::ostream& output_stream, Module_reference const& value)
    {
        rapidjson::OStreamWrapper stream_wrapper{ output_stream };
        rapidjson::Writer<rapidjson::OStreamWrapper> writer{ stream_wrapper };
        h::json::write(writer, value);

        return output_stream;
    }

    export std::istream& operator>>(std::istream& input_stream, Alias_type_reference& value)
    {
        rapidjson::Reader reader;
        rapidjson::IStreamWrapper stream_wrapper{ input_stream };
        std::optional<Alias_type_reference> const output = h::json::read<Alias_type_reference>(reader, stream_wrapper);

        if (output)
        {
            value = std::move(*output);
        }

        return input_stream;
    }

    export std::ostream& operator<<(std::ostream& output_stream, Alias_type_reference const& value)
    {
        rapidjson::OStreamWrapper stream_wrapper{ output_stream };
        rapidjson::Writer<rapidjson::OStreamWrapper> writer{ stream_wrapper };
        h::json::write(writer, value);

        return output_stream;
    }

    export std::istream& operator>>(std::istream& input_stream, Constant_array_type& value)
    {
        rapidjson::Reader reader;
        rapidjson::IStreamWrapper stream_wrapper{ input_stream };
        std::optional<Constant_array_type> const output = h::json::read<Constant_array_type>(reader, stream_wrapper);

        if (output)
        {
            value = std::move(*output);
        }

        return input_stream;
    }

    export std::ostream& operator<<(std::ostream& output_stream, Constant_array_type const& value)
    {
        rapidjson::OStreamWrapper stream_wrapper{ output_stream };
        rapidjson::Writer<rapidjson::OStreamWrapper> writer{ stream_wrapper };
        h::json::write(writer, value);

        return output_stream;
    }

    export std::istream& operator>>(std::istream& input_stream, Enum_type_reference& value)
    {
        rapidjson::Reader reader;
        rapidjson::IStreamWrapper stream_wrapper{ input_stream };
        std::optional<Enum_type_reference> const output = h::json::read<Enum_type_reference>(reader, stream_wrapper);

        if (output)
        {
            value = std::move(*output);
        }

        return input_stream;
    }

    export std::ostream& operator<<(std::ostream& output_stream, Enum_type_reference const& value)
    {
        rapidjson::OStreamWrapper stream_wrapper{ output_stream };
        rapidjson::Writer<rapidjson::OStreamWrapper> writer{ stream_wrapper };
        h::json::write(writer, value);

        return output_stream;
    }

    export std::istream& operator>>(std::istream& input_stream, Struct_type_reference& value)
    {
        rapidjson::Reader reader;
        rapidjson::IStreamWrapper stream_wrapper{ input_stream };
        std::optional<Struct_type_reference> const output = h::json::read<Struct_type_reference>(reader, stream_wrapper);

        if (output)
        {
            value = std::move(*output);
        }

        return input_stream;
    }

    export std::ostream& operator<<(std::ostream& output_stream, Struct_type_reference const& value)
    {
        rapidjson::OStreamWrapper stream_wrapper{ output_stream };
        rapidjson::Writer<rapidjson::OStreamWrapper> writer{ stream_wrapper };
        h::json::write(writer, value);

        return output_stream;
    }

    export std::istream& operator>>(std::istream& input_stream, Type_reference& value)
    {
        rapidjson::Reader reader;
        rapidjson::IStreamWrapper stream_wrapper{ input_stream };
        std::optional<Type_reference> const output = h::json::read<Type_reference>(reader, stream_wrapper);

        if (output)
        {
            value = std::move(*output);
        }

        return input_stream;
    }

    export std::ostream& operator<<(std::ostream& output_stream, Type_reference const& value)
    {
        rapidjson::OStreamWrapper stream_wrapper{ output_stream };
        rapidjson::Writer<rapidjson::OStreamWrapper> writer{ stream_wrapper };
        h::json::write(writer, value);

        return output_stream;
    }

    export std::istream& operator>>(std::istream& input_stream, Alias_type_declaration& value)
    {
        rapidjson::Reader reader;
        rapidjson::IStreamWrapper stream_wrapper{ input_stream };
        std::optional<Alias_type_declaration> const output = h::json::read<Alias_type_declaration>(reader, stream_wrapper);

        if (output)
        {
            value = std::move(*output);
        }

        return input_stream;
    }

    export std::ostream& operator<<(std::ostream& output_stream, Alias_type_declaration const& value)
    {
        rapidjson::OStreamWrapper stream_wrapper{ output_stream };
        rapidjson::Writer<rapidjson::OStreamWrapper> writer{ stream_wrapper };
        h::json::write(writer, value);

        return output_stream;
    }

    export std::istream& operator>>(std::istream& input_stream, Enum_value& value)
    {
        rapidjson::Reader reader;
        rapidjson::IStreamWrapper stream_wrapper{ input_stream };
        std::optional<Enum_value> const output = h::json::read<Enum_value>(reader, stream_wrapper);

        if (output)
        {
            value = std::move(*output);
        }

        return input_stream;
    }

    export std::ostream& operator<<(std::ostream& output_stream, Enum_value const& value)
    {
        rapidjson::OStreamWrapper stream_wrapper{ output_stream };
        rapidjson::Writer<rapidjson::OStreamWrapper> writer{ stream_wrapper };
        h::json::write(writer, value);

        return output_stream;
    }

    export std::istream& operator>>(std::istream& input_stream, Enum_declaration& value)
    {
        rapidjson::Reader reader;
        rapidjson::IStreamWrapper stream_wrapper{ input_stream };
        std::optional<Enum_declaration> const output = h::json::read<Enum_declaration>(reader, stream_wrapper);

        if (output)
        {
            value = std::move(*output);
        }

        return input_stream;
    }

    export std::ostream& operator<<(std::ostream& output_stream, Enum_declaration const& value)
    {
        rapidjson::OStreamWrapper stream_wrapper{ output_stream };
        rapidjson::Writer<rapidjson::OStreamWrapper> writer{ stream_wrapper };
        h::json::write(writer, value);

        return output_stream;
    }

    export std::istream& operator>>(std::istream& input_stream, Struct_declaration& value)
    {
        rapidjson::Reader reader;
        rapidjson::IStreamWrapper stream_wrapper{ input_stream };
        std::optional<Struct_declaration> const output = h::json::read<Struct_declaration>(reader, stream_wrapper);

        if (output)
        {
            value = std::move(*output);
        }

        return input_stream;
    }

    export std::ostream& operator<<(std::ostream& output_stream, Struct_declaration const& value)
    {
        rapidjson::OStreamWrapper stream_wrapper{ output_stream };
        rapidjson::Writer<rapidjson::OStreamWrapper> writer{ stream_wrapper };
        h::json::write(writer, value);

        return output_stream;
    }

    export std::istream& operator>>(std::istream& input_stream, Function_reference& value)
    {
        rapidjson::Reader reader;
        rapidjson::IStreamWrapper stream_wrapper{ input_stream };
        std::optional<Function_reference> const output = h::json::read<Function_reference>(reader, stream_wrapper);

        if (output)
        {
            value = std::move(*output);
        }

        return input_stream;
    }

    export std::ostream& operator<<(std::ostream& output_stream, Function_reference const& value)
    {
        rapidjson::OStreamWrapper stream_wrapper{ output_stream };
        rapidjson::Writer<rapidjson::OStreamWrapper> writer{ stream_wrapper };
        h::json::write(writer, value);

        return output_stream;
    }

    export std::istream& operator>>(std::istream& input_stream, Variable_expression& value)
    {
        rapidjson::Reader reader;
        rapidjson::IStreamWrapper stream_wrapper{ input_stream };
        std::optional<Variable_expression> const output = h::json::read<Variable_expression>(reader, stream_wrapper);

        if (output)
        {
            value = std::move(*output);
        }

        return input_stream;
    }

    export std::ostream& operator<<(std::ostream& output_stream, Variable_expression const& value)
    {
        rapidjson::OStreamWrapper stream_wrapper{ output_stream };
        rapidjson::Writer<rapidjson::OStreamWrapper> writer{ stream_wrapper };
        h::json::write(writer, value);

        return output_stream;
    }

    export std::istream& operator>>(std::istream& input_stream, Binary_expression& value)
    {
        rapidjson::Reader reader;
        rapidjson::IStreamWrapper stream_wrapper{ input_stream };
        std::optional<Binary_expression> const output = h::json::read<Binary_expression>(reader, stream_wrapper);

        if (output)
        {
            value = std::move(*output);
        }

        return input_stream;
    }

    export std::ostream& operator<<(std::ostream& output_stream, Binary_expression const& value)
    {
        rapidjson::OStreamWrapper stream_wrapper{ output_stream };
        rapidjson::Writer<rapidjson::OStreamWrapper> writer{ stream_wrapper };
        h::json::write(writer, value);

        return output_stream;
    }

    export std::istream& operator>>(std::istream& input_stream, Call_expression& value)
    {
        rapidjson::Reader reader;
        rapidjson::IStreamWrapper stream_wrapper{ input_stream };
        std::optional<Call_expression> const output = h::json::read<Call_expression>(reader, stream_wrapper);

        if (output)
        {
            value = std::move(*output);
        }

        return input_stream;
    }

    export std::ostream& operator<<(std::ostream& output_stream, Call_expression const& value)
    {
        rapidjson::OStreamWrapper stream_wrapper{ output_stream };
        rapidjson::Writer<rapidjson::OStreamWrapper> writer{ stream_wrapper };
        h::json::write(writer, value);

        return output_stream;
    }

    export std::istream& operator>>(std::istream& input_stream, Constant_expression& value)
    {
        rapidjson::Reader reader;
        rapidjson::IStreamWrapper stream_wrapper{ input_stream };
        std::optional<Constant_expression> const output = h::json::read<Constant_expression>(reader, stream_wrapper);

        if (output)
        {
            value = std::move(*output);
        }

        return input_stream;
    }

    export std::ostream& operator<<(std::ostream& output_stream, Constant_expression const& value)
    {
        rapidjson::OStreamWrapper stream_wrapper{ output_stream };
        rapidjson::Writer<rapidjson::OStreamWrapper> writer{ stream_wrapper };
        h::json::write(writer, value);

        return output_stream;
    }

    export std::istream& operator>>(std::istream& input_stream, Invalid_expression& value)
    {
        rapidjson::Reader reader;
        rapidjson::IStreamWrapper stream_wrapper{ input_stream };
        std::optional<Invalid_expression> const output = h::json::read<Invalid_expression>(reader, stream_wrapper);

        if (output)
        {
            value = std::move(*output);
        }

        return input_stream;
    }

    export std::ostream& operator<<(std::ostream& output_stream, Invalid_expression const& value)
    {
        rapidjson::OStreamWrapper stream_wrapper{ output_stream };
        rapidjson::Writer<rapidjson::OStreamWrapper> writer{ stream_wrapper };
        h::json::write(writer, value);

        return output_stream;
    }

    export std::istream& operator>>(std::istream& input_stream, Return_expression& value)
    {
        rapidjson::Reader reader;
        rapidjson::IStreamWrapper stream_wrapper{ input_stream };
        std::optional<Return_expression> const output = h::json::read<Return_expression>(reader, stream_wrapper);

        if (output)
        {
            value = std::move(*output);
        }

        return input_stream;
    }

    export std::ostream& operator<<(std::ostream& output_stream, Return_expression const& value)
    {
        rapidjson::OStreamWrapper stream_wrapper{ output_stream };
        rapidjson::Writer<rapidjson::OStreamWrapper> writer{ stream_wrapper };
        h::json::write(writer, value);

        return output_stream;
    }

    export std::istream& operator>>(std::istream& input_stream, Expression& value)
    {
        rapidjson::Reader reader;
        rapidjson::IStreamWrapper stream_wrapper{ input_stream };
        std::optional<Expression> const output = h::json::read<Expression>(reader, stream_wrapper);

        if (output)
        {
            value = std::move(*output);
        }

        return input_stream;
    }

    export std::ostream& operator<<(std::ostream& output_stream, Expression const& value)
    {
        rapidjson::OStreamWrapper stream_wrapper{ output_stream };
        rapidjson::Writer<rapidjson::OStreamWrapper> writer{ stream_wrapper };
        h::json::write(writer, value);

        return output_stream;
    }

    export std::istream& operator>>(std::istream& input_stream, Statement& value)
    {
        rapidjson::Reader reader;
        rapidjson::IStreamWrapper stream_wrapper{ input_stream };
        std::optional<Statement> const output = h::json::read<Statement>(reader, stream_wrapper);

        if (output)
        {
            value = std::move(*output);
        }

        return input_stream;
    }

    export std::ostream& operator<<(std::ostream& output_stream, Statement const& value)
    {
        rapidjson::OStreamWrapper stream_wrapper{ output_stream };
        rapidjson::Writer<rapidjson::OStreamWrapper> writer{ stream_wrapper };
        h::json::write(writer, value);

        return output_stream;
    }

    export std::istream& operator>>(std::istream& input_stream, Function_declaration& value)
    {
        rapidjson::Reader reader;
        rapidjson::IStreamWrapper stream_wrapper{ input_stream };
        std::optional<Function_declaration> const output = h::json::read<Function_declaration>(reader, stream_wrapper);

        if (output)
        {
            value = std::move(*output);
        }

        return input_stream;
    }

    export std::ostream& operator<<(std::ostream& output_stream, Function_declaration const& value)
    {
        rapidjson::OStreamWrapper stream_wrapper{ output_stream };
        rapidjson::Writer<rapidjson::OStreamWrapper> writer{ stream_wrapper };
        h::json::write(writer, value);

        return output_stream;
    }

    export std::istream& operator>>(std::istream& input_stream, Function_definition& value)
    {
        rapidjson::Reader reader;
        rapidjson::IStreamWrapper stream_wrapper{ input_stream };
        std::optional<Function_definition> const output = h::json::read<Function_definition>(reader, stream_wrapper);

        if (output)
        {
            value = std::move(*output);
        }

        return input_stream;
    }

    export std::ostream& operator<<(std::ostream& output_stream, Function_definition const& value)
    {
        rapidjson::OStreamWrapper stream_wrapper{ output_stream };
        rapidjson::Writer<rapidjson::OStreamWrapper> writer{ stream_wrapper };
        h::json::write(writer, value);

        return output_stream;
    }

    export std::istream& operator>>(std::istream& input_stream, Language_version& value)
    {
        rapidjson::Reader reader;
        rapidjson::IStreamWrapper stream_wrapper{ input_stream };
        std::optional<Language_version> const output = h::json::read<Language_version>(reader, stream_wrapper);

        if (output)
        {
            value = std::move(*output);
        }

        return input_stream;
    }

    export std::ostream& operator<<(std::ostream& output_stream, Language_version const& value)
    {
        rapidjson::OStreamWrapper stream_wrapper{ output_stream };
        rapidjson::Writer<rapidjson::OStreamWrapper> writer{ stream_wrapper };
        h::json::write(writer, value);

        return output_stream;
    }

    export std::istream& operator>>(std::istream& input_stream, Module_declarations& value)
    {
        rapidjson::Reader reader;
        rapidjson::IStreamWrapper stream_wrapper{ input_stream };
        std::optional<Module_declarations> const output = h::json::read<Module_declarations>(reader, stream_wrapper);

        if (output)
        {
            value = std::move(*output);
        }

        return input_stream;
    }

    export std::ostream& operator<<(std::ostream& output_stream, Module_declarations const& value)
    {
        rapidjson::OStreamWrapper stream_wrapper{ output_stream };
        rapidjson::Writer<rapidjson::OStreamWrapper> writer{ stream_wrapper };
        h::json::write(writer, value);

        return output_stream;
    }

    export std::istream& operator>>(std::istream& input_stream, Module_definitions& value)
    {
        rapidjson::Reader reader;
        rapidjson::IStreamWrapper stream_wrapper{ input_stream };
        std::optional<Module_definitions> const output = h::json::read<Module_definitions>(reader, stream_wrapper);

        if (output)
        {
            value = std::move(*output);
        }

        return input_stream;
    }

    export std::ostream& operator<<(std::ostream& output_stream, Module_definitions const& value)
    {
        rapidjson::OStreamWrapper stream_wrapper{ output_stream };
        rapidjson::Writer<rapidjson::OStreamWrapper> writer{ stream_wrapper };
        h::json::write(writer, value);

        return output_stream;
    }

    export std::istream& operator>>(std::istream& input_stream, Module& value)
    {
        rapidjson::Reader reader;
        rapidjson::IStreamWrapper stream_wrapper{ input_stream };
        std::optional<Module> const output = h::json::read<Module>(reader, stream_wrapper);

        if (output)
        {
            value = std::move(*output);
        }

        return input_stream;
    }

    export std::ostream& operator<<(std::ostream& output_stream, Module const& value)
    {
        rapidjson::OStreamWrapper stream_wrapper{ output_stream };
        rapidjson::Writer<rapidjson::OStreamWrapper> writer{ stream_wrapper };
        h::json::write(writer, value);

        return output_stream;
    }

}
