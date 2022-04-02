module;

#include <ostream>
#include <variant>
#include <vector>

module h.core;

namespace h
{
    namespace
    {
        template<typename Value_type>
        std::ostream& operator<<(std::ostream& output_stream, std::pmr::vector<Value_type> const& values)
        {
            output_stream << '[';
            {
                for (std::size_t index = 0; (index + 1) < values.size(); ++index)
                {
                    if constexpr (std::is_same_v<Value_type, std::pmr::string>)
                    {
                        output_stream << '"' << values[index] << '"' << ',';
                    }
                    else
                    {
                        output_stream << values[index] << ',';
                    }
                }

                if (!values.empty())
                {
                    if constexpr (std::is_same_v<Value_type, std::pmr::string>)
                    {
                        output_stream << '"' << values.back() << '"';
                    }
                    else
                    {
                        output_stream << values.back();
                    }
                }
            }
            output_stream << ']';

            return output_stream;
        }

        template<typename T>
        void write(std::ostream& output_stream, char const* const name, T const& value, bool const add_comma = true)
        {
            if constexpr (std::is_same_v<T, std::pmr::string>)
            {
                output_stream << '"' << name << '"' << ": \"" << value << '"';

                if (add_comma)
                {
                    output_stream << ',';
                }
            }
            else
            {
                output_stream << '"' << name << '"' << ": " << value;

                if (add_comma)
                {
                    output_stream << ',';
                }
            }
        }
    }

    std::ostream& operator<<(std::ostream& output_stream, Integer_type const value)
    {
        output_stream << '{';
        {
            write(output_stream, "precision", static_cast<std::uint64_t>(value.precision), false);
        }
        output_stream << '}';

        return output_stream;
    }

    std::ostream& operator<<(std::ostream& output_stream, Float_type const value)
    {
        output_stream << '{';
        {
            write(output_stream, "precision", static_cast<std::uint64_t>(value.precision), false);
        }
        output_stream << '}';

        return output_stream;
    }

    std::ostream& operator<<(std::ostream& output_stream, Type const& value)
    {
        output_stream << '{';
        {
            auto const visitor = [&](auto&& arg) -> void
            {
                using T = std::decay_t<decltype(arg)>;

                output_stream << "\"type\": \"";
                if constexpr (std::is_same_v<T, Float_type>)
                    output_stream << "float_type";
                else if constexpr (std::is_same_v<T, Integer_type>)
                    output_stream << "integer_type";
                else
                    static_assert(always_false_v<T>, "non-exhaustive visitor!");
                output_stream << "\", ";

                output_stream << "\"data\": " << arg;
            };

            std::visit(visitor, value.data);
        }
        output_stream << '}';

        return output_stream;
    }

    std::ostream& operator<<(std::ostream& output_stream, Variable_expression::Type const value)
    {
        output_stream << '"';
        switch (value)
        {
        case Variable_expression::Type::Function_argument:
            output_stream << "function_argument";
            break;
        case Variable_expression::Type::Local_variable:
            output_stream << "local_variable";
            break;
        case Variable_expression::Type::Temporary:
            output_stream << "temporary";
            break;
        }
        output_stream << '"';

        return output_stream;
    }

    std::ostream& operator<<(std::ostream& output_stream, Variable_expression const value)
    {
        output_stream << '{';
        {
            write(output_stream, "type", value.type);
            write(output_stream, "id", value.id, false);
        }
        output_stream << '}';

        return output_stream;
    }

    std::ostream& operator<<(std::ostream& output_stream, Binary_expression::Operation value)
    {
        output_stream << '"';
        switch (value)
        {
        case Binary_expression::Operation::Add:
            output_stream << "add";
            break;
        case Binary_expression::Operation::Subtract:
            output_stream << "subtract";
            break;
        case Binary_expression::Operation::Multiply:
            output_stream << "multiply";
            break;
        case Binary_expression::Operation::Signed_divide:
            output_stream << "signed_divide";
            break;
        case Binary_expression::Operation::Unsigned_divide:
            output_stream << "unsigned_divide";
            break;
        case Binary_expression::Operation::Less_than:
            output_stream << "less_than";
            break;
        }
        output_stream << '"';

        return output_stream;
    }

    std::ostream& operator<<(std::ostream& output_stream, Binary_expression const& value)
    {
        output_stream << '{';
        {
            write(output_stream, "left_hand_side", value.left_hand_side);
            write(output_stream, "right_hand_side", value.right_hand_side);
            write(output_stream, "operation", value.operation, false);
        }
        output_stream << '}';

        return output_stream;
    }

    std::ostream& operator<<(std::ostream& output_stream, Call_expression const& value)
    {
        output_stream << '{';
        {
            write(output_stream, "function_name", value.function_name);
            write(output_stream, "arguments", value.arguments, false);
        }
        output_stream << '}';

        return output_stream;
    }

    std::ostream& operator<<(std::ostream& output_stream, Integer_constant const& value)
    {
        output_stream << '{';
        {
            write(output_stream, "number_of_bits", value.number_of_bits);
            write(output_stream, "is_signed", value.is_signed);
            write(output_stream, "value", value.value, false);
        }
        output_stream << '}';

        return output_stream;
    }

    std::ostream& operator<<(std::ostream& output_stream, Half_constant const value)
    {
        output_stream << '{';
        {
            write(output_stream, "value", value.value, false);
        }
        output_stream << '}';

        return output_stream;
    }

    std::ostream& operator<<(std::ostream& output_stream, Float_constant const value)
    {
        output_stream << '{';
        {
            write(output_stream, "value", value.value, false);
        }
        output_stream << '}';

        return output_stream;
    }

    std::ostream& operator<<(std::ostream& output_stream, Double_constant const value)
    {
        output_stream << '{';
        {
            write(output_stream, "value", value.value, false);
        }
        output_stream << '}';

        return output_stream;
    }

    std::ostream& operator<<(std::ostream& output_stream, Constant_expression const& value)
    {
        output_stream << '{';
        {
            write(output_stream, "type", value.type);

            auto const visitor = [&](auto&& arg) -> void
            {
                output_stream << arg;
            };

            output_stream << "\"data\": ";
            std::visit(visitor, value.data);
        }
        output_stream << '}';

        return output_stream;
    }

    std::ostream& operator<<(std::ostream& output_stream, Return_expression const& value)
    {
        output_stream << '{';
        {
            write(output_stream, "variable", value.variable, false);
        }
        output_stream << '}';

        return output_stream;
    }

    std::ostream& operator<<(std::ostream& output_stream, Expression const& value)
    {
        output_stream << '{';
        {
            auto const visitor = [&](auto&& arg) -> void
            {
                using T = std::decay_t<decltype(arg)>;

                output_stream << "\"type\": \"";
                if constexpr (std::is_same_v<T, Binary_expression>)
                    output_stream << "binary_expression";
                else if constexpr (std::is_same_v<T, Call_expression>)
                    output_stream << "call_expression";
                else if constexpr (std::is_same_v<T, Constant_expression>)
                    output_stream << "constant_expression";
                else if constexpr (std::is_same_v<T, Return_expression>)
                    output_stream << "return_expression";
                else if constexpr (std::is_same_v<T, Variable_expression>)
                    output_stream << "variable_expression";
                else
                    static_assert(always_false_v<T>, "non-exhaustive visitor!");
                output_stream << "\", ";

                output_stream << "\"data\": " << arg;
            };

            std::visit(visitor, value.data);
        }
        output_stream << '}';

        return output_stream;
    }

    std::ostream& operator<<(std::ostream& output_stream, Statement const& value)
    {
        output_stream << '{';
        {
            write(output_stream, "id", value.id);
            write(output_stream, "name", value.name);
            write(output_stream, "expressions", value.expressions, false);
        }
        output_stream << '}';

        return output_stream;
    }

    std::ostream& operator<<(std::ostream& output_stream, Function_declaration const& value)
    {
        output_stream << '{';
        {
            write(output_stream, "name", value.name);
            write(output_stream, "return_type", value.return_type);
            write(output_stream, "parameter_types", value.parameter_types);
            write(output_stream, "parameter_ids", value.parameter_ids);
            write(output_stream, "parameter_names", value.parameter_names);
            write(output_stream, "linkage", value.linkage, false);
        }
        output_stream << '}';

        return output_stream;
    }

    std::ostream& operator<<(std::ostream& output_stream, Linkage const value)
    {
        output_stream << '"';
        switch (value)
        {
        case Linkage::External:
            output_stream << "external";
            break;
        case Linkage::Private:
            output_stream << "private";
            break;
        default:
            throw std::runtime_error{ "Linkage type is not recognized!" };
        }
        output_stream << '"';

        return output_stream;
    }

    std::ostream& operator<<(std::ostream& output_stream, Function_definition const& value)
    {
        output_stream << '{';
        {
            write(output_stream, "name", value.name);
            write(output_stream, "statements", value.statements, false);
        }
        output_stream << '}';

        return output_stream;
    }

    std::ostream& operator<<(std::ostream& output_stream, Language_version const& value)
    {
        output_stream << '{';
        {
            write(output_stream, "major", value.major);
            write(output_stream, "minor", value.minor);
            write(output_stream, "patch", value.patch, false);
        }
        output_stream << '}';

        return output_stream;
    }

    std::ostream& operator<<(std::ostream& output_stream, Module_declarations const& value)
    {
        output_stream << '{';
        {
            write(output_stream, "function_declarations", value.function_declarations, false);
        }
        output_stream << '}';

        return output_stream;
    }

    std::ostream& operator<<(std::ostream& output_stream, Module_definitions const& value)
    {
        output_stream << '{';
        {
            write(output_stream, "function_definitions", value.function_definitions, false);
        }
        output_stream << '}';

        return output_stream;
    }

    std::ostream& operator<<(std::ostream& output_stream, Module const& value)
    {
        output_stream << '{';
        {
            write(output_stream, "language_version", value.language_version);
            write(output_stream, "export_declarations", value.export_declarations);
            write(output_stream, "internal_declarations", value.internal_declarations);
            write(output_stream, "definitions", value.definitions, false);
        }
        output_stream << '}';

        return output_stream;
    }
}
