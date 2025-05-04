module;

#include <cctype>
#include <filesystem>
#include <memory_resource>
#include <optional>
#include <string>
#include <string_view>
#include <vector>

module h.parser.convertor;

import h.core;
import h.core.types;
import h.parser.parse_tree;
import h.parser.type_name_parser;

namespace h::parser
{
    std::pmr::string create_string(
        std::string_view const value,
        std::pmr::polymorphic_allocator<> const& output_allocator
    )
    {
        return std::pmr::string{value, output_allocator};
    }

    std::string_view get_number_suffix(
        std::string_view const value
    )
    {
        std::size_t const start = value.starts_with("0x") ? 0 : 2;

        for (std::size_t index = start; index < value.size(); ++index)
        {
            char const character = value[index];

            if (std::isalpha(character) && character != '.')
                return value.substr(index);
        }

        return "";
    }

    std::string_view get_string_suffix(
        std::string_view const value
    )
    {
        auto const location = value.rfind("\"");
        return value.substr(location + 1);
    }

    static std::optional<std::string_view> get_module_name(
        Parse_tree const& tree,
        Parse_node const& node
    )
    {
        std::optional<Parse_node> const module_head = get_child_node(tree, node, 0);
        if (!module_head.has_value())
            return std::nullopt;

        std::optional<Parse_node> const module_declaration = get_child_node(tree, module_head.value(), 0);
        if (!module_declaration.has_value())
            return std::nullopt;

        std::optional<Parse_node> const module_name = get_child_node(tree, module_declaration.value(), "Module_name");
        if (!module_name.has_value())
            return std::nullopt;

        return get_node_value(tree, module_name.value());
    }

    std::optional<h::Module> parse_node_to_module(
        Parse_tree const& tree,
        Parse_node const& node,
        std::filesystem::path source_file_path,
        std::pmr::polymorphic_allocator<> const& output_allocator,
        std::pmr::polymorphic_allocator<> const& temporaries_allocator
    )
    {
        std::optional<Parse_node> const module_head_node = get_child_node(tree, node, "Module_head");

        std::optional<std::string_view> const module_name = get_module_name(tree, node);
        if (!module_name.has_value())
            return std::nullopt;

        h::Module output = {};
        output.name = module_name.value();
        output.source_file_path = source_file_path;

        output.dependencies.alias_imports = create_import_modules(
            tree,
            module_head_node,
            output_allocator,
            temporaries_allocator
        );

        Module_info const module_info =
        {
            .module_name = output.name,
            .alias_imports = output.dependencies.alias_imports
        };

        std::pmr::vector<Parse_node> const child_nodes = get_child_nodes(tree, node, temporaries_allocator);
        for (std::size_t child_index = 1; child_index < child_nodes.size(); ++child_index)
        {
            Parse_node const declaration_node = child_nodes[child_index];
            node_to_declaration(output, module_info, tree, declaration_node, output_allocator, temporaries_allocator);
        }

        return output;
    }

    std::pmr::vector<Import_module_with_alias> create_import_modules(
        Parse_tree const& tree,
        std::optional<Parse_node> const& module_head_node,
        std::pmr::polymorphic_allocator<> const& output_allocator,
        std::pmr::polymorphic_allocator<> const& temporaries_allocator
    )
    {
        std::pmr::vector<Import_module_with_alias> output{output_allocator};
        
        if (!module_head_node.has_value())
            return output;

        std::pmr::vector<Parse_node> const child_nodes = get_child_nodes(tree, module_head_node.value(), temporaries_allocator);
        if (child_nodes.size() <= 1)
            return output;

        output.reserve(child_nodes.size() - 1);

        for (std::size_t child_index = 1; child_index < child_nodes.size(); ++child_index)
        {
            Parse_node const child_node = child_nodes[child_index];

            std::optional<Import_module_with_alias> import_alias = node_to_import_module_with_alias(
                tree,
                child_node,
                output_allocator
            );

            if (import_alias.has_value())
                output.push_back(std::move(import_alias.value()));
        }

        return output;
    }

    std::optional<Import_module_with_alias> node_to_import_module_with_alias(
        Parse_tree const& tree,
        Parse_node const& node,
        std::pmr::polymorphic_allocator<> const& output_allocator
    )
    {
        std::optional<Parse_node> const import_name_node = get_child_node(tree, node, "Import_name");
        if (!import_name_node.has_value())
            return std::nullopt;

        std::optional<Parse_node> const import_alias_node = get_child_node(tree, node, "Import_alias");
        if (!import_alias_node.has_value())
            return std::nullopt;

        std::string_view const import_name = get_node_value(tree, import_name_node.value());
        std::string_view const import_alias = get_node_value(tree, import_alias_node.value());

        return Import_module_with_alias
        {
            .module_name = create_string(import_name, output_allocator),
            .alias = create_string(import_alias, output_allocator)
        };
    }

    enum class Declaration_type
    {
        Alias,
        Enum,
        Global_variable,
        Struct,
        Union,
        Function,
        Type_constructor,
        Function_constructor
    };

    static bool is_export_declaration(Parse_tree const& tree, Parse_node const& node)
    {
        std::optional<Parse_node> const export_node = get_child_node(tree, node, "export");
        return export_node.has_value();
    }

    void node_to_declaration(
        h::Module& core_module,
        Module_info const& module_info,
        Parse_tree const& tree,
        Parse_node const& node,
        std::pmr::polymorphic_allocator<> const& output_allocator,
        std::pmr::polymorphic_allocator<> const& temporaries_allocator
    )
    {
        bool const is_export = is_export_declaration(tree, node);

        std::optional<Parse_node> const declaration_value_node = get_last_child_node(tree, node);
        if (!declaration_value_node.has_value())
            return;

        std::string_view const declaration_type = get_node_symbol(declaration_value_node.value());

        /*if (declaration_type == "Alias_type_declaration")
        {
            Alias_type_declaration declaration = node_to_alias_type_declaration(tree, node, declaration_value_node.value(), output_allocator);
            
            if (is_export)
                core_module.export_declarations.alias_type_declarations.push_back(std::move(declaration));
            else
                core_module.internal_declarations.alias_type_declarations.push_back(std::move(declaration));
        }
        else if (declaration_type == "Enum_declaration")
        {
            Enum_declaration const declaration = node_to_enum_declaration(tree, node, declaration_value_node.value(), output_allocator);

            if (is_export)
                core_module.export_declarations.enum_declarations.push_back(std::move(declaration));
            else
                core_module.internal_declarations.enum_declarations.push_back(std::move(declaration));
        }
        else if (declaration_type == "Global_variable_declaration")
        {
            Global_variable_declaration const declaration = node_to_global_variable_declaration(tree, node, declaration_value_node.value(), output_allocator);

            if (is_export)
                core_module.export_declarations.global_variable_declarations.push_back(std::move(declaration));
            else
                core_module.internal_declarations.global_variable_declarations.push_back(std::move(declaration));
        }
        else if (declaration_type == "Struct_declaration")
        {
            Struct_declaration const declaration = node_to_struct_declaration(tree, node, declaration_value_node.value(), output_allocator);

            if (is_export)
                core_module.export_declarations.struct_declarations.push_back(std::move(declaration));
            else
                core_module.internal_declarations.struct_declarations.push_back(std::move(declaration));
        }
        else if (declaration_type == "Union_declaration")
        {
            Union_declaration const declaration = node_to_union_declaration(tree, node, declaration_value_node.value(), output_allocator);

            if (is_export)
                core_module.export_declarations.union_declarations.push_back(std::move(declaration));
            else
                core_module.internal_declarations.union_declarations.push_back(std::move(declaration));
        }
        else*/ if (declaration_type == "Function")
        {
            std::optional<Parse_node> const function_declaration_node = get_child_node(tree, declaration_value_node.value(), 0);
            if (!function_declaration_node.has_value())
                return;

            Function_declaration function_declaration = node_to_function_declaration(
                module_info,
                tree,
                function_declaration_node.value(),
                is_export ? h::Linkage::External : h::Linkage::Private,
                output_allocator,
                temporaries_allocator
            );

            std::optional<Parse_node> const function_definition_node = get_child_node(tree, declaration_value_node.value(), 1);
            if (function_definition_node.has_value() && get_node_symbol(*function_definition_node) == "Function_definition")
            {
                Function_definition function_definition = node_to_function_definition(
                    module_info,
                    tree,
                    function_definition_node.value(),
                    function_declaration.name,
                    output_allocator,
                    temporaries_allocator
                );
    
                core_module.definitions.function_definitions.push_back(std::move(function_definition));
            }

            if (is_export)
                core_module.export_declarations.function_declarations.push_back(std::move(function_declaration));
            else
                core_module.internal_declarations.function_declarations.push_back(std::move(function_declaration));
        }
        /*else if (declaration_type == "Type_constructor_declaration")
        {
            Type_constructor_declaration const declaration = node_to_type_constructor_declaration(tree, node, declaration_value_node.value(), output_allocator);

            if (is_export)
                core_module.export_declarations.function_constructors.push_back(std::move(declaration));
            else
                core_module.internal_declarations.function_constructors.push_back(std::move(declaration));
        }
        else if (declaration_type == "Function_constructor_declaration")
        {
            Function_constructor_declaration const declaration = node_to_function_constructor_declaration(tree, node, declaration_value_node.value(), output_allocator);

            if (is_export)
                core_module.export_declarations.type_constructors.push_back(std::move(declaration));
            else
                core_module.internal_declarations.type_constructors.push_back(std::move(declaration));
        }*/
    }

    std::optional<h::Type_reference> node_to_type_reference(
        Module_info const& module_info,
        Parse_tree const& tree,
        Parse_node const& node,
        std::pmr::polymorphic_allocator<> const& output_allocator,
        std::pmr::polymorphic_allocator<> const& temporaries_allocator
    )
    {
        h::Type_reference output{};
        
        std::optional<Parse_node> const child = get_child_node(tree, node, 0);
        if (!child.has_value())
            return {};

        std::string_view const type_choice = get_node_symbol(child.value());

        if (type_choice == "Type_name")
        {
            std::optional<Parse_node> const type_name_node = get_child_node(tree, child.value(), 0);
            if (!type_name_node.has_value())
                return {};

            std::string_view const type_name = get_node_value(tree, type_name_node.value());

            if (type_name == "Type")
                return create_builtin_type_reference(create_string("Type", output_allocator));

            return parse_type_name(
                module_info.module_name,
                type_name,
                output_allocator
            );
        }
        else if (type_choice == "Module_type")
        {
            // TODO
        }
        else if (type_choice == "Pointer_type")
        {
            // TODO
        }
        else if (type_choice == "Constant_array_type")
        {
            // TODO
        }
        else if (type_choice == "Function_pointer_type")
        {
            // TODO
        }
        else if (type_choice == "Type_instance_type")
        {
            // TODO
        }

        return std::nullopt;
    }

    /*static h::Alias_type_declaration node_to_alias_type_declaration(
        Parse_tree const& tree,
        Parse_node const& root,
        Parse_node const& node,
        std::pmr::polymorphic_allocator<> const& output_allocator
    )
    {
        h::Alias_type_declaration output{output_allocator};
        
        auto name_node = get_child_node(tree, node, "Alias_name");
        if (name_node.has_value())
        {
            output.name = create_string(get_node_value(name_node.value()), output_allocator);
        }

        auto type_node = get_child_node(tree, node, "Type");
        if (type_node.has_value())
        {
            output.type = node_to_type_reference(tree, root, type_node.value(), output_allocator);
        }

        return output;
    }

    static h::Enum_declaration node_to_enum_declaration(
        Parse_tree const& tree,
        Parse_node const& root,
        Parse_node const& node,
        std::pmr::polymorphic_allocator<> const& output_allocator
    )
    {
        h::Enum_declaration output{output_allocator};
        
        auto name_node = get_child_node(tree, node, "Enum_name");
        if (name_node.has_value())
        {
            output.name = create_string(get_node_value(name_node.value()), output_allocator);
        }

        auto values_node = get_child_node(tree, node, "Enum_values");
        if (values_node.has_value())
        {
            auto value_nodes = get_child_nodes(tree, values_node.value(), output_allocator);
            for (auto const& value_node : value_nodes)
            {
                h::Enum_value enum_value{};
                auto name_node = get_child_node(tree, value_node, "Enum_value_name");
                if (name_node.has_value())
                {
                    enum_value.name = create_string(get_node_value(name_node.value()), output_allocator);
                }
                // Handle enum value if present
                output.values.push_back(enum_value);
            }
        }

        return output;
    }

    static h::Global_variable_declaration node_to_global_variable_declaration(
        Parse_tree const& tree,
        Parse_node const& root,
        Parse_node const& node,
        std::pmr::polymorphic_allocator<> const& output_allocator
    )
    {
        h::Global_variable_declaration output{};
        
        auto name_node = get_child_node(tree, node, "Global_variable_name");
        if (name_node.has_value())
        {
            output.name = create_string(get_node_value(name_node.value()), output_allocator);
        }

        auto mutability_node = get_child_node(tree, node, "Global_variable_mutability");
        if (mutability_node.has_value())
        {
            output.is_mutable = get_node_value(mutability_node.value()) == "mut";
        }

        auto type_node = get_child_node(tree, node, "Type");
        if (type_node.has_value())
        {
            output.type = node_to_type_reference(tree, root, type_node.value(), output_allocator);
        }

        return output;
    }

    static h::Function_condition node_to_function_condition(
        Parse_tree const& tree,
        Parse_node const& root,
        Parse_node const& node,
        bool is_precondition,
        std::pmr::polymorphic_allocator<> const& output_allocator
    )
    {
        h::Function_condition output{};
        
        auto name_node = get_child_node(tree, node, is_precondition ? "Function_precondition_name" : "Function_postcondition_name");
        if (name_node.has_value())
        {
            output.description = create_string(get_node_value(name_node.value()), output_allocator);
        }

        auto expr_node = get_child_node(tree, node, "Expression");
        if (expr_node.has_value())
        {
            output.expression = node_to_expression(tree, root, expr_node.value(), output_allocator);
        }

        return output;
    }*/

    static void add_function_parameters(
        std::pmr::vector<std::pmr::string>& parameter_names,
        std::pmr::vector<Type_reference>& parameter_types,
        Module_info const& module_info,
        Parse_tree const& tree,
        std::span<Parse_node const> const parameter_nodes,
        std::pmr::polymorphic_allocator<> const& output_allocator,
        std::pmr::polymorphic_allocator<> const& temporaries_allocator
    )
    {
        for (Parse_node const& parameter_node : parameter_nodes)
        {
            std::optional<Parse_node> const parameter_name_node = get_child_node(tree, parameter_node, "Function_parameter_name");
            std::pmr::string parameter_name = 
                parameter_name_node.has_value() ?
                create_string(get_node_value(tree, parameter_name_node.value()), output_allocator) :
                create_string("", output_allocator);
            
            parameter_names.push_back(std::move(parameter_name));

            std::optional<Parse_node> const parameter_type_node = get_child_node(tree, parameter_node, "Function_parameter_type");
            std::optional<Parse_node> const type_node = parameter_type_node.has_value() ? get_child_node(tree, parameter_type_node.value(), 0) : std::nullopt;
            std::optional<Type_reference> parameter_type = 
                type_node.has_value() ?
                node_to_type_reference(module_info, tree, type_node.value(), output_allocator, temporaries_allocator) :
                std::nullopt;

            if (parameter_type.has_value())
                parameter_types.push_back(std::move(parameter_type.value()));
            else
                parameter_types.push_back({});
        }
    }

    h::Function_declaration node_to_function_declaration(
        Module_info const& module_info,
        Parse_tree const& tree,
        Parse_node const& node,
        h::Linkage const linkage,
        std::pmr::polymorphic_allocator<> const& output_allocator,
        std::pmr::polymorphic_allocator<> const& temporaries_allocator
    )
    {
        h::Function_declaration output;
        
        std::optional<Parse_node> const name_node = get_child_node(tree, node, "Function_name");
        if (name_node.has_value())
            output.name = create_string(get_node_value(tree, name_node.value()), output_allocator);

        output.linkage = linkage;

        std::pmr::vector<Parse_node> const input_parameter_nodes = get_child_nodes_of_parent(tree, node, "Function_input_parameters", "Function_parameter", temporaries_allocator);
        add_function_parameters(
            output.input_parameter_names,
            output.type.input_parameter_types,
            module_info,
            tree,
            input_parameter_nodes,
            output_allocator,
            temporaries_allocator
        );

        std::pmr::vector<Parse_node> const output_parameter_nodes = get_child_nodes_of_parent(tree, node, "Function_output_parameters", "Function_parameter", temporaries_allocator);
        add_function_parameters(
            output.output_parameter_names,
            output.type.output_parameter_types,
            module_info,
            tree,
            output_parameter_nodes,
            output_allocator,
            temporaries_allocator
        );
        
        // TODO
        /*std::optional<Parse_node> const preconditions_node = get_child_node(tree, node, "Function_preconditions");
        if (preconditions_node.has_value())
        {
            std::pmr::vector<Parse_node> const condition_nodes = get_child_nodes(tree, preconditions_node.value(), temporaries_allocator);
            for (Parse_node const& condition_node : condition_nodes)
            {
                output.preconditions.push_back(
                    node_to_function_condition(tree, condition_node, true, output_allocator, temporaries_allocator)
                );
            }
        }

        std::optional<Parse_node> const postconditions_node = get_child_node(tree, node, "Function_postconditions");
        if (postconditions_node.has_value())
        {
            std::pmr::vector<Parse_node> const condition_nodes = get_child_nodes(tree, postconditions_node.value(), temporaries_allocator);
            for (Parse_node const& condition_node : condition_nodes)
            {
                output.postconditions.push_back(
                    node_to_function_condition(tree, condition_node, false, output_allocator, temporaries_allocator)
                );
            }
        }*/

        return output;
    }

    h::Function_definition node_to_function_definition(
        Module_info const& module_info,
        Parse_tree const& tree,
        Parse_node const& node,
        std::string_view const function_name,
        std::pmr::polymorphic_allocator<> const& output_allocator,
        std::pmr::polymorphic_allocator<> const& temporaries_allocator
    )
    {
        h::Function_definition output;
        output.name = create_string(function_name, output_allocator);

        std::optional<Parse_node> const block_node = get_child_node(tree, node, 0);
        if (block_node.has_value())
        {
            h::Block_expression block = node_to_expression_block(
                module_info,
                tree,
                block_node.value(),
                output_allocator,
                temporaries_allocator
            );

            output.statements = std::move(block.statements);
        }

        return output;
    }

    /*static h::Struct_declaration node_to_struct_declaration(
        Parse_tree const& tree,
        Parse_node const& root,
        Parse_node const& node,
        std::pmr::polymorphic_allocator<> const& output_allocator
    )
    {
        h::Struct_declaration output{output_allocator};
        
        auto name_node = get_child_node(tree, node, "Struct_name");
        if (name_node.has_value())
        {
            output.name = create_string(get_node_value(name_node.value()), output_allocator);
        }

        auto members_node = get_child_node(tree, node, "Struct_members");
        if (members_node.has_value())
        {
            auto member_nodes = get_child_nodes(tree, members_node.value(), output_allocator);
            for (auto const& member_node : member_nodes)
            {
                auto name = get_child_node(tree, member_node, "Struct_member_name");
                if (name.has_value())
                {
                    output.member_names.push_back(create_string(get_node_value(name.value()), output_allocator));
                }

                auto type = get_child_node(tree, member_node, "Type");
                if (type.has_value())
                {
                    output.member_types.push_back(
                        node_to_type_reference(tree, root, type.value(), output_allocator)
                    );
                }
            }
        }

        return output;
    }

    static h::Union_declaration node_to_union_declaration(
        Parse_tree const& tree,
        Parse_node const& root,
        Parse_node const& node,
        std::pmr::polymorphic_allocator<> const& output_allocator
    )
    {
        h::Union_declaration output{output_allocator};
        
        auto name_node = get_child_node(tree, node, "Union_name");
        if (name_node.has_value())
        {
            output.name = create_string(get_node_value(name_node.value()), output_allocator);
        }

        auto members_node = get_child_node(tree, node, "Union_members");
        if (members_node.has_value())
        {
            auto member_nodes = get_child_nodes(tree, members_node.value(), output_allocator);
            for (auto const& member_node : member_nodes)
            {
                auto name = get_child_node(tree, member_node, "Union_member_name");
                if (name.has_value())
                {
                    output.member_names.push_back(create_string(get_node_value(name.value()), output_allocator));
                }

                auto type = get_child_node(tree, member_node, "Type");
                if (type.has_value())
                {
                    output.member_types.push_back(
                        node_to_type_reference(tree, root, type.value(), output_allocator)
                    );
                }
            }
        }

        return output;
    }*/

    h::Statement node_to_statement(
        Module_info const& module_info,
        Parse_tree const& tree,
        Parse_node const& node,
        std::pmr::polymorphic_allocator<> const& output_allocator,
        std::pmr::polymorphic_allocator<> const& temporaries_allocator
    )
    {
        h::Statement output;
        output.expressions = std::pmr::vector<h::Expression>{temporaries_allocator};
        
        std::optional<Parse_node> const expression_node = get_child_node(tree, node, 0);
        if (expression_node.has_value())
        {
            node_to_expression(output, module_info, tree, expression_node.value(), output_allocator, temporaries_allocator);
        }

        std::pmr::vector<h::Expression> final_expressions{output_allocator};
        final_expressions.assign(output.expressions.begin(), output.expressions.end());
        output.expressions = std::move(final_expressions);
        
        return output;
    }

    static std::optional<Parse_node> get_non_generic_expression_node(
        Parse_tree const& tree,
        Parse_node const& node
    )
    {
        std::string_view const symbol = get_node_symbol(node);
        
        if (symbol == "Generic_expression" || symbol == "Generic_expression_or_instantiate")
        {
            std::optional<Parse_node> const child = get_child_node(tree, node, 0);
            if (!child.has_value())
                return std::nullopt;

            return get_non_generic_expression_node(tree, child.value());
        }
        else
        {
            return node;
        }
    }

    h::Expression_index node_to_expression(
        h::Statement& statement,
        Module_info const& module_info,
        Parse_tree const& tree,
        Parse_node const& node,
        std::pmr::polymorphic_allocator<> const& output_allocator,
        std::pmr::polymorphic_allocator<> const& temporaries_allocator
    )
    {
        h::Expression expression;
            
        std::optional<Parse_node> const expression_node_optional = get_non_generic_expression_node(tree, node);
        if (!expression_node_optional.has_value())
            return {.expression_index = static_cast<std::uint64_t>(-1)};

        Parse_node const& expression_node = expression_node_optional.value();
        std::string_view const expression_type = get_node_symbol(expression_node);

        std::size_t const expression_index = statement.expressions.size();
        statement.expressions.push_back({});

        if (expression_type == "Expression_access")
        {
            expression.data = node_to_expression_access(statement, module_info, tree, expression_node, output_allocator, temporaries_allocator);
        }
        /*else if (expression_type == "Expression_access_array")
        {
            expression.data = node_to_expression_access_array(module_info, tree, expression_node, output_allocator, temporaries_allocator);
        }
        else if (expression_type == "Expression_assignment")
        {
            expression.data = node_to_expression_assignment(module_info, tree, expression_node, output_allocator, temporaries_allocator);
        }
        else if (expression_type == "Expression_binary")
        {
            expression.data = node_to_expression_binary(module_info, tree, expression_node, output_allocator, temporaries_allocator);
        }*/
        else if (expression_type == "Expression_block")
        {
            expression.data = node_to_expression_block(module_info, tree, expression_node, output_allocator, temporaries_allocator);
        }
        /*else if (expression_type == "Expression_break")
        {
            expression.data = node_to_expression_break(module_info, tree, expr_type.value(), output_allocator);
        }*/
        else if (expression_type == "Expression_call")
        {
            expression.data = node_to_expression_call(statement, module_info, tree, expression_node, output_allocator, temporaries_allocator);
        }
        /*else if (expression_type == "Expression_cast")
        {
            expression.data = node_to_expression_cast(module_info, tree, expression_node, output_allocator, temporaries_allocator);
        }
        else if (expression_type == "Expression_comment")
        {
            expression.data = node_to_expression_comment(module_info, tree, expr_type.value(), output_allocator);
        }*/
        else if (expression_type == "Expression_constant")
        {
            expression.data = node_to_expression_constant(tree, expression_node, output_allocator);
        }
        /*else if (expression_type == "Expression_constant_array")
        {
            expression.data = node_to_expression_constant_array(module_info, tree, expression_node, output_allocator, temporaries_allocator);
        }
        else if (expression_type == "Expression_continue")
        {
            expression.data = node_to_expression_continue(module_info, );
        }
        else if (expression_type == "Expression_defer")
        {
            expression.data = node_to_expression_defer(module_info, tree, expression_node, output_allocator, temporaries_allocator);
        }
        else if (expression_type == "Expression_for_loop")
        {
            expression.data = node_to_expression_for_loop(module_info, tree, expression_node, output_allocator, temporaries_allocator);
        }
        else if (expression_type == "Expression_if")
        {
            expression.data = node_to_expression_if(module_info, tree, expression_node, output_allocator, temporaries_allocator);
        }
        else if (expression_type == "Expression_instance_call")
        {
            expression.data = node_to_expression_instance_call(module_info, tree, expression_node, output_allocator, temporaries_allocator);
        }
        else if (expression_type == "Expression_instantiate")
        {
            expression.data = node_to_expression_instantiate(module_info, tree, expression_node, output_allocator, temporaries_allocator);
        }
        else if (expression_type == "Expression_null_pointer")
        {
            expression.data = node_to_expression_null_pointer(module_info, );
        }
        else if (expression_type == "Expression_parenthesis")
        {
            expression.data = node_to_expression_parenthesis(module_info, tree, expression_node, output_allocator, temporaries_allocator);
        }
        else if (expression_type == "Expression_reflection")
        {
            expression.data = node_to_expression_reflection(module_info, tree, expression_node, output_allocator, temporaries_allocator);
        }*/
        else if (expression_type == "Expression_return")
        {
            expression.data = node_to_expression_return(statement, module_info, tree, expression_node, output_allocator, temporaries_allocator);
        }
        /*else if (expression_type == "Expression_switch")
        {
            expression.data = node_to_expression_switch(module_info, tree, expression_node, output_allocator, temporaries_allocator);
        }
        else if (expression_type == "Expression_ternary_condition")
        {
            expression.data = node_to_expression_ternary_condition(module_info, tree, expression_node, output_allocator, temporaries_allocator);
        }
        else if (expression_type == "Expression_type")
        {
            expression.data = node_to_expression_type(module_info, tree, expression_node, output_allocator, temporaries_allocator);
        }
        else if (expression_type == "Expression_unary")
        {
            expression.data = node_to_expression_unary(module_info, tree, expression_node, output_allocator, temporaries_allocator);
        }
        else if (expression_type == "Expression_variable_declaration")
        {
            expression.data = node_to_expression_variable_declaration(module_info, tree, expression_node, output_allocator, temporaries_allocator);
        }
        else if (expression_type == "Expression_variable_declaration_with_type")
        {
            expression.data = node_to_expression_variable_declaration_with_type(module_info, tree, expression_node, output_allocator, temporaries_allocator);
        }*/
        else if (expression_type == "Expression_variable")
        {
            expression.data = node_to_expression_variable(tree, expression_node, output_allocator);
        }
        /*else if (expression_type == "Expression_while_loop")
        {
            expression.data = node_to_expression_while_loop(module_info, tree, expression_node, output_allocator, temporaries_allocator);
        }*/
        else
        {
            return {.expression_index = static_cast<std::uint64_t>(-1)};
        }

        statement.expressions[expression_index] = std::move(expression);
        
        return {.expression_index = expression_index };
    }

    h::Access_expression node_to_expression_access(
        h::Statement& statement,
        Module_info const& module_info,
        Parse_tree const& tree,
        Parse_node const& node,
        std::pmr::polymorphic_allocator<> const& output_allocator,
        std::pmr::polymorphic_allocator<> const& temporaries_allocator
    )
    {
        h::Access_expression output = {};

        std::optional<Parse_node> const left_hand_side = get_child_node(tree, node, "Generic_expression");
        if (left_hand_side.has_value())
        {
            output.expression = node_to_expression(
                statement,
                module_info,
                tree,
                left_hand_side.value(),
                output_allocator,
                temporaries_allocator
            );
        }
        
        std::optional<Parse_node> const member_name = get_child_node(tree, node, "Expression_access_member_name");
        if (member_name.has_value())
            output.member_name = create_string(get_node_value(tree, member_name.value()), output_allocator);
        
        return output;
    }

    h::Block_expression node_to_expression_block(
        Module_info const& module_info,
        Parse_tree const& tree,
        Parse_node const& node,
        std::pmr::polymorphic_allocator<> const& output_allocator,
        std::pmr::polymorphic_allocator<> const& temporaries_allocator
    )
    {
        h::Block_expression output;

        std::pmr::vector<Parse_node> const child_nodes = get_named_child_nodes(tree, node, temporaries_allocator);
        
        std::size_t const child_count = child_nodes.size();
        output.statements = std::pmr::vector<h::Statement>{output_allocator};
        output.statements.resize(child_count);

        for (std::size_t child_index = 0; child_index < child_count; ++child_index)
        {
            Parse_node const& statement_node = child_nodes[child_index];

            Statement statement = node_to_statement(module_info, tree, statement_node, output_allocator, temporaries_allocator);
            output.statements[child_index] = std::move(statement);
        }
        
        return output;
    }

    h::Call_expression node_to_expression_call(
        h::Statement& statement,
        Module_info const& module_info,
        Parse_tree const& tree,
        Parse_node const& node,
        std::pmr::polymorphic_allocator<> const& output_allocator,
        std::pmr::polymorphic_allocator<> const& temporaries_allocator
    )
    {
        h::Call_expression output = {};
        
        std::optional<Parse_node> const function = get_child_node(tree, node, 0);
        if (function.has_value())
            output.expression = node_to_expression(statement, module_info, tree, function.value(), output_allocator, temporaries_allocator);
        
        std::pmr::vector<Parse_node> const argument_nodes = get_child_nodes_of_parent(tree, node, "Expression_call_arguments", "Generic_expression_or_instantiate", temporaries_allocator);

        output.arguments.resize(1);

        for (std::size_t argument_index = 0; argument_index < argument_nodes.size(); ++argument_index)
        {
            Parse_node const& argument_node = argument_nodes[argument_index];

            Expression_index const argument = node_to_expression(statement, module_info, tree, argument_node, output_allocator, temporaries_allocator);
            output.arguments[argument_index] = argument;
        }
        
        return output;
    }

    h::Constant_expression node_to_expression_constant(
        Parse_tree const& tree,
        Parse_node const& node,
        std::pmr::polymorphic_allocator<> const& output_allocator
    )
    {        
        std::optional<Parse_node> choice_node = get_child_node(tree, node, 0);
        if (!choice_node.has_value())
            return {};

        std::string_view const choice = get_node_symbol(choice_node.value());
        std::string_view const value = get_node_value(tree, node);

        if (choice == "Boolean")
        {
            return 
            {
                .type = create_fundamental_type_type_reference(h::Fundamental_type::Bool),
                .data = create_string(value, output_allocator),
            };
        }
        else if (choice == "Number")
        {
            std::string_view const suffix = get_number_suffix(value);
            if (suffix.empty())
            {
                return 
                {
                    .type = create_integer_type_type_reference(32, true),
                    .data = create_string(value, output_allocator),
                };
            }
            
            std::string_view const value_without_suffix = value.substr(0, value.size() - suffix.size());
            
            char const first_character = suffix[0];

            if (first_character == 'i' || first_character == 'u')
            {
                bool const is_signed = first_character == 'i';
                std::uint32_t const number_of_bits = parse_number_of_bits(suffix.substr(1));
                return 
                {
                    .type = create_integer_type_type_reference(number_of_bits, is_signed),
                    .data = create_string(value_without_suffix, output_allocator),
                };
            }

            if (first_character == 'f')
            {
                std::uint32_t const number_of_bits = parse_number_of_bits(suffix.substr(1));

                if (number_of_bits == 16)
                {
                    return 
                    {
                        .type = create_fundamental_type_type_reference(h::Fundamental_type::Float16),
                        .data = create_string(value_without_suffix, output_allocator),
                    };
                }
                else if (number_of_bits == 64)
                {
                    return 
                    {
                        .type = create_fundamental_type_type_reference(h::Fundamental_type::Float64),
                        .data = create_string(value_without_suffix, output_allocator),
                    };
                }
                else
                {
                    return 
                    {
                        .type = create_fundamental_type_type_reference(h::Fundamental_type::Float32),
                        .data = create_string(value_without_suffix, output_allocator),
                    };
                }
            }

            if (first_character == 'c')
            {
                if (suffix == "cc")
                {
                    return 
                    {
                        .type = create_fundamental_type_type_reference(h::Fundamental_type::C_char),
                        .data = create_string(value_without_suffix, output_allocator),
                    };
                }
                else if (suffix == "cs")
                {
                    return 
                    {
                        .type = create_fundamental_type_type_reference(h::Fundamental_type::C_short),
                        .data = create_string(value_without_suffix, output_allocator),
                    };
                }
                else if (suffix == "ci")
                {
                    return 
                    {
                        .type = create_fundamental_type_type_reference(h::Fundamental_type::C_int),
                        .data = create_string(value_without_suffix, output_allocator),
                    };
                }
                else if (suffix == "cl")
                {
                    return 
                    {
                        .type = create_fundamental_type_type_reference(h::Fundamental_type::C_long),
                        .data = create_string(value_without_suffix, output_allocator),
                    };
                }
                else if (suffix == "cll")
                {
                    return 
                    {
                        .type = create_fundamental_type_type_reference(h::Fundamental_type::C_longlong),
                        .data = create_string(value_without_suffix, output_allocator),
                    };
                }
                else if (suffix == "cuc")
                {
                    return 
                    {
                        .type = create_fundamental_type_type_reference(h::Fundamental_type::C_uchar),
                        .data = create_string(value_without_suffix, output_allocator),
                    };
                }
                else if (suffix == "cus")
                {
                    return 
                    {
                        .type = create_fundamental_type_type_reference(h::Fundamental_type::C_ushort),
                        .data = create_string(value_without_suffix, output_allocator),
                    };
                }
                else if (suffix == "cui")
                {
                    return 
                    {
                        .type = create_fundamental_type_type_reference(h::Fundamental_type::C_uint),
                        .data = create_string(value_without_suffix, output_allocator),
                    };
                }
                else if (suffix == "cul")
                {
                    return 
                    {
                        .type = create_fundamental_type_type_reference(h::Fundamental_type::C_ulong),
                        .data = create_string(value_without_suffix, output_allocator),
                    };
                }
                else if (suffix == "cull")
                {
                    return 
                    {
                        .type = create_fundamental_type_type_reference(h::Fundamental_type::C_ulonglong),
                        .data = create_string(value_without_suffix, output_allocator),
                    };
                }
                else if (suffix == "cb")
                {
                    return 
                    {
                        .type = create_fundamental_type_type_reference(h::Fundamental_type::C_bool),
                        .data = create_string(value_without_suffix, output_allocator),
                    };
                }
            }
        }
        else if (choice == "String")
        {
            std::string_view const suffix = get_string_suffix(value);

            std::string_view const value_without_suffix = value.substr(0, value.size() - suffix.size());
            std::string_view const value_without_quotes = value_without_suffix.substr(1, value_without_suffix.size() - 2);

            if (suffix == "c")
            {
                return 
                {
                    .type = create_c_string_type_reference(false),
                    .data = create_string(value_without_quotes, output_allocator),
                };
            }
            else
            {
                return 
                {
                    .type = create_fundamental_type_type_reference(h::Fundamental_type::String),
                    .data = create_string(value_without_quotes, output_allocator),
                };
            }
        }
        
        return {};
    }

    h::Return_expression node_to_expression_return(
        h::Statement& statement,
        Module_info const& module_info,
        Parse_tree const& tree,
        Parse_node const& node,
        std::pmr::polymorphic_allocator<> const& output_allocator,
        std::pmr::polymorphic_allocator<> const& temporaries_allocator
    )
    {
        std::optional<Parse_node> const value_node = get_child_node(tree, node, "Generic_expression_or_instantiate");
        if (!value_node.has_value())
            return {};

        h::Return_expression output;
        output.expression = node_to_expression(statement, module_info, tree, value_node.value(), output_allocator, temporaries_allocator);
        return output;
    }

    h::Variable_expression node_to_expression_variable(
        Parse_tree const& tree,
        Parse_node const& node,
        std::pmr::polymorphic_allocator<> const& output_allocator
    )
    {
        h::Variable_expression output;
        
        std::optional<Parse_node> const name_node = get_child_node(tree, node, "Variable_name");
        if (name_node.has_value())
        {
            std::string_view const name = get_node_value(tree, name_node.value());
            output.name = create_string(name, output_allocator);
        }
        
        return output;
    }

    /*static h::Instance_call_expression node_to_expression_instance_call(
        Parse_tree const& tree,
        Parse_node const& root,
        Parse_node const& node,
        std::pmr::polymorphic_allocator<> const& output_allocator
    )
    {
        h::Instance_call_expression output{output_allocator};
        
        auto key_node = get_child_node(tree, node, "Expression_instance_call_key");
        if (key_node.has_value())
        {
            h::Instance_call_key key{};
            
            auto module_node = get_child_node(tree, key_node.value(), "Expression_instance_call_module");
            if (module_node.has_value())
            {
                key.module_name = create_string(get_node_value(module_node.value()), output_allocator);
            }
            
            auto type_node = get_child_node(tree, key_node.value(), "Expression_instance_call_type");
            if (type_node.has_value())
            {
                key.type_name = create_string(get_node_value(type_node.value()), output_allocator);
            }
            
            auto function_node = get_child_node(tree, key_node.value(), "Expression_instance_call_function");
            if (function_node.has_value())
            {
                key.function_name = create_string(get_node_value(function_node.value()), output_allocator);
            }
            
            output.key = std::move(key);
        }
        
        auto args = get_child_node(tree, node, "Expression_call_arguments");
        if (args.has_value())
        {
            auto arg_nodes = get_child_nodes(tree, args.value(), output_allocator);
            for (auto const& arg : arg_nodes)
            {
                output.arguments.push_back(node_to_expression(tree, root, arg, output_allocator));
            }
        }
        
        return output;
    }

    static h::Type_expression node_to_expression_type(
        Parse_tree const& tree,
        Parse_node const& root,
        Parse_node const& node,
        std::pmr::polymorphic_allocator<> const& output_allocator
    )
    {
        h::Type_expression output{};
        
        auto type = get_child_node(tree, node, "Type");
        if (type.has_value())
        {
            output.type = node_to_type_reference(tree, root, type.value(), output_allocator);
        }
        
        return output;
    }

    static h::Reflection_expression node_to_expression_reflection(
        Parse_tree const& tree,
        Parse_node const& root,
        Parse_node const& node,
        std::pmr::polymorphic_allocator<> const& output_allocator
    )
    {
        h::Reflection_expression output{};
        
        auto expr = get_child_node(tree, node, "Expression");
        if (expr.has_value())
        {
            output.expression = node_to_expression(tree, root, expr.value(), output_allocator);
        }
        
        return output;
    }

    static h::Defer_expression node_to_expression_defer(
        Parse_tree const& tree,
        Parse_node const& root,
        Parse_node const& node,
        std::pmr::polymorphic_allocator<> const& output_allocator
    )
    {
        h::Defer_expression output{};
        
        auto expr = get_child_node(tree, node, "Expression");
        if (expr.has_value())
        {
            output.expression = node_to_expression(tree, root, expr.value(), output_allocator);
        }
        
        return output;
    }

    static h::Comment_expression node_to_expression_comment(
        Parse_tree const& tree,
        Parse_node const& node,
        std::pmr::polymorphic_allocator<> const& output_allocator
    )
    {
        h::Comment_expression output{};
        
        auto comment = get_child_node(tree, node, "Expression_comment");
        if (comment.has_value())
        {
            output.comment = create_string(get_node_value(comment.value()), output_allocator);
        }
        
        return output;
    }

    static h::Null_pointer_expression node_to_expression_null_pointer()
    {
        return h::Null_pointer_expression{};
    }

    static h::Parenthesis_expression node_to_expression_parenthesis(
        Parse_tree const& tree,
        Parse_node const& root,
        Parse_node const& node,
        std::pmr::polymorphic_allocator<> const& output_allocator
    )
    {
        h::Parenthesis_expression output{};
        
        auto expr = get_child_node(tree, node, "Expression");
        if (expr.has_value())
        {
            output.expression = node_to_expression(tree, root, expr.value(), output_allocator);
        }
        
        return output;
    }

    static h::Instantiate_expression node_to_expression_instantiate(
        Parse_tree const& tree,
        Parse_node const& root,
        Parse_node const& node,
        std::pmr::polymorphic_allocator<> const& output_allocator
    )
    {
        h::Instantiate_expression output{output_allocator};
        
        auto type = get_child_node(tree, node, "Type");
        if (type.has_value())
        {
            output.type = node_to_type_reference(tree, root, type.value(), output_allocator);
        }
        
        auto type_expr = get_child_node(tree, node, "Expression_instantiate_expression_type");
        if (type_expr.has_value())
        {
            auto type_value = get_node_value(type_expr.value());
            output.type = type_value == "explicit" ? 
                h::Instantiate_expression_type::Explicit : 
                h::Instantiate_expression_type::Default;
        }
        
        auto members = get_child_node(tree, node, "Expression_instantiate_members");
        if (members.has_value())
        {
            auto member_nodes = get_child_nodes(tree, members.value(), output_allocator);
            for (auto const& member_node : member_nodes)
            {
                h::Instantiate_member_value_pair pair{};
                
                auto name = get_child_node(tree, member_node, "Expression_instantiate_member_name");
                if (name.has_value())
                {
                    pair.member_name = create_string(get_node_value(name.value()), output_allocator);
                }
                
                auto value = get_child_node(tree, member_node, "Expression");
                if (value.has_value())
                {
                    pair.value = node_to_expression(tree, root, value.value(), output_allocator);
                }
                
                output.members.push_back(std::move(pair));
            }
        }
        
        return output;
    }

    static h::Ternary_condition_expression node_to_expression_ternary_condition(
        Parse_tree const& tree,
        Parse_node const& root,
        Parse_node const& node,
        std::pmr::polymorphic_allocator<> const& output_allocator
    )
    {
        h::Ternary_condition_expression output{};
        
        auto condition = get_child_node(tree, node, "Expression_condition");
        if (condition.has_value())
        {
            output.condition = node_to_expression(tree, root, condition.value(), output_allocator);
        }
        
        auto then_expr = get_child_node(tree, node, "Expression_then");
        if (then_expr.has_value())
        {
            output.then_expression = node_to_expression(tree, root, then_expr.value(), output_allocator);
        }
        
        auto else_expr = get_child_node(tree, node, "Expression_else");
        if (else_expr.has_value())
        {
            output.else_expression = node_to_expression(tree, root, else_expr.value(), output_allocator);
        }
        
        return output;
    }

    static h::Assignment_expression node_to_expression_assignment(
        Parse_tree const& tree,
        Parse_node const& root,
        Parse_node const& node,
        std::pmr::polymorphic_allocator<> const& output_allocator
    )
    {
        h::Assignment_expression output{};
        
        auto target = get_child_node(tree, node, "Expression_target");
        if (target.has_value())
        {
            output.target = node_to_expression(tree, root, target.value(), output_allocator);
        }
        
        auto value = get_child_node(tree, node, "Expression_value");
        if (value.has_value())
        {
            output.value = node_to_expression(tree, root, value.value(), output_allocator);
        }
        
        auto op = get_child_node(tree, node, "Expression_assignment_symbol");
        if (op.has_value())
        {
            output.additional_operation = get_assignment_operation(get_node_value(op.value()));
        }
        
        return output;
    }

    static h::Binary_expression node_to_expression_binary(
        Parse_tree const& tree,
        Parse_node const& root,
        Parse_node const& node,
        std::pmr::polymorphic_allocator<> const& output_allocator
    )
    {
        h::Binary_expression output{};
        
        auto left = get_child_node(tree, node, "Expression_left");
        if (left.has_value())
        {
            output.left = node_to_expression(tree, root, left.value(), output_allocator);
        }
        
        auto right = get_child_node(tree, node, "Expression_right");
        if (right.has_value())
        {
            output.right = node_to_expression(tree, root, right.value(), output_allocator);
        }
        
        auto op = get_child_node(tree, node, "Expression_binary_symbol");
        if (op.has_value())
        {
            output.operation = get_binary_operation(get_node_value(op.value()));
        }
        
        return output;
    }

    static h::If_expression node_to_expression_if(
        Parse_tree const& tree,
        Parse_node const& root,
        Parse_node const& node,
        std::pmr::polymorphic_allocator<> const& output_allocator
    )
    {
        h::If_expression output{output_allocator};

        auto if_series = get_child_node(tree, node, "Expression_if_series");
        if (if_series.has_value())
        {
            auto series_nodes = get_child_nodes(tree, if_series.value(), output_allocator);
            for (auto const& serie : series_nodes)
            {
                h::Condition_statement_pair pair{output_allocator};

                auto condition = get_child_node(tree, serie, "Expression_condition");
                if (condition.has_value())
                {
                    pair.condition = node_to_expression(tree, root, condition.value(), output_allocator);
                }

                auto statements = get_child_node(tree, serie, "Expression_if_statements");
                if (statements.has_value())
                {
                    auto statement_nodes = get_child_nodes(tree, statements.value(), output_allocator);
                    for (auto const& stmt : statement_nodes)
                    {
                        pair.then_statements.push_back(node_to_statement(tree, root, stmt, output_allocator));
                    }
                }

                output.series.push_back(std::move(pair));
            }
        }

        return output;
    }

    static h::While_loop_expression node_to_expression_while_loop(
        Parse_tree const& tree,
        Parse_node const& root,
        Parse_node const& node,
        std::pmr::polymorphic_allocator<> const& output_allocator
    )
    {
        h::While_loop_expression output{output_allocator};

        auto condition = get_child_node(tree, node, "Expression_condition");
        if (condition.has_value())
        {
            output.condition = node_to_expression(tree, root, condition.value(), output_allocator);
        }

        auto statements = get_child_node(tree, node, "Expression_while_loop_statements");
        if (statements.has_value())
        {
            auto statement_nodes = get_child_nodes(tree, statements.value(), output_allocator);
            for (auto const& stmt : statement_nodes)
            {
                output.then_statements.push_back(node_to_statement(tree, root, stmt, output_allocator));
            }
        }

        return output;
    }

    static h::For_loop_expression node_to_expression_for_loop(
        Parse_tree const& tree,
        Parse_node const& root,
        Parse_node const& node,
        std::pmr::polymorphic_allocator<> const& output_allocator
    )
    {
        h::For_loop_expression output{output_allocator};

        auto var_name = get_child_node(tree, node, "Expression_for_loop_variable");
        if (var_name.has_value())
        {
            output.variable_name = create_string(get_node_value(var_name.value()), output_allocator);
        }

        auto start = get_child_node(tree, node, "Expression_for_loop_start");
        if (start.has_value())
        {
            output.start = node_to_expression(tree, root, start.value(), output_allocator);
        }

        auto end = get_child_node(tree, node, "Expression_for_loop_end");
        if (end.has_value())
        {
            output.end = node_to_expression(tree, root, end.value(), output_allocator);
        }

        auto step = get_child_node(tree, node, "Expression_for_loop_step");
        if (step.has_value())
        {
            output.step_by = node_to_expression(tree, root, step.value(), output_allocator);
        }

        auto statements = get_child_node(tree, node, "Expression_for_loop_statements");
        if (statements.has_value())
        {
            auto statement_nodes = get_child_nodes(tree, statements.value(), output_allocator);
            for (auto const& stmt : statement_nodes)
            {
                output.then_statements.push_back(node_to_statement(tree, root, stmt, output_allocator));
            }
        }

        // Handle reverse direction
        auto reverse_node = get_child_node(tree, node, "Expression_for_loop_reverse");
        if (reverse_node.has_value())
        {
            output.range_comparison_operation = h::Binary_operation::Greater_than;
        }
        else
        {
            output.range_comparison_operation = h::Binary_operation::Less_than;
        }

        return output;
    }

    static h::Switch_expression node_to_expression_switch(
        Parse_tree const& tree,
        Parse_node const& root,
        Parse_node const& node,
        std::pmr::polymorphic_allocator<> const& output_allocator
    )
    {
        h::Switch_expression output{output_allocator};

        auto value = get_child_node(tree, node, "Expression_switch_value");
        if (value.has_value())
        {
            output.value = node_to_expression(tree, root, value.value(), output_allocator);
        }

        auto cases = get_child_node(tree, node, "Expression_switch_cases");
        if (cases.has_value())
        {
            auto case_nodes = get_child_nodes(tree, cases.value(), output_allocator);
            for (auto const& case_node : case_nodes)
            {
                h::Switch_case_expression_pair case_pair = node_to_expression_switch_case(tree, root, case_node, output_allocator);
                output.cases.push_back(std::move(case_pair));
            }
        }

        return output;
    }

    static h::Switch_case_expression_pair node_to_expression_switch_case(
        Parse_tree const& tree,
        Parse_node const& root,
        Parse_node const& node,
        std::pmr::polymorphic_allocator<> const& output_allocator
    )
    {
        h::Switch_case_expression_pair output{output_allocator};

        auto case_value = get_child_node(tree, node, "Expression_switch_case_value");
        if (case_value.has_value())
        {
            output.case_value = node_to_expression(tree, root, case_value.value(), output_allocator);
        }

        auto statements = get_child_node(tree, node, "Expression_switch_case_statements");
        if (statements.has_value())
        {
            auto statement_nodes = get_child_nodes(tree, statements.value(), output_allocator);
            for (auto const& stmt : statement_nodes)
            {
                output.statements.push_back(node_to_statement(tree, root, stmt, output_allocator));
            }
        }

        return output;
    }

    static h::Variable_declaration_expression node_to_expression_variable_declaration(
        Parse_tree const& tree,
        Parse_node const& root,
        Parse_node const& node,
        std::pmr::polymorphic_allocator<> const& output_allocator
    )
    {
        h::Variable_declaration_expression output{};
        
        auto name = get_child_node(tree, node, "Variable_name");
        if (name.has_value())
        {
            output.name = create_string(get_node_value(name.value()), output_allocator);
        }
        
        auto mutability = get_child_node(tree, node, "Expression_variable_mutability");
        if (mutability.has_value())
        {
            output.is_mutable = get_node_value(mutability.value()) == "mut";
        }
        
        auto value = get_child_node(tree, node, "Expression");
        if (value.has_value())
        {
            output.value = node_to_expression(tree, root, value.value(), output_allocator);
        }
        
        return output;
    }

    static h::Variable_declaration_with_type_expression node_to_expression_variable_declaration_with_type(
        Parse_tree const& tree,
        Parse_node const& root,
        Parse_node const& node,
        std::pmr::polymorphic_allocator<> const& output_allocator
    )
    {
        h::Variable_declaration_with_type_expression output{};
        
        auto name = get_child_node(tree, node, "Variable_name");
        if (name.has_value())
        {
            output.name = create_string(get_node_value(name.value()), output_allocator);
        }
        
        auto mutability = get_child_node(tree, node, "Expression_variable_mutability");
        if (mutability.has_value())
        {
            output.is_mutable = get_node_value(mutability.value()) == "mut";
        }
        
        auto type = get_child_node(tree, node, "Type");
        if (type.has_value())
        {
            output.type = node_to_type_reference(tree, root, type.value(), output_allocator);
        }
        
        auto value = get_child_node(tree, node, "Expression");
        if (value.has_value())
        {
            output.value = node_to_expression(tree, root, value.value(), output_allocator);
        }
        
        return output;
    }

    static h::Unary_expression node_to_expression_unary(
        Parse_tree const& tree,
        Parse_node const& root,
        Parse_node const& node,
        std::pmr::polymorphic_allocator<> const& output_allocator
    )
    {
        h::Unary_expression output{};
        
        auto operand = get_child_node(tree, node, "Expression_operand");
        if (operand.has_value())
        {
            output.operand = node_to_expression(tree, root, operand.value(), output_allocator);
        }
        
        auto op = get_child_node(tree, node, "Expression_unary_symbol");
        if (op.has_value())
        {
            output.operation = get_unary_operation(get_node_value(op.value()));
        }
        
        return output;
    }

    static h::Break_expression node_to_expression_break(
        Parse_tree const& tree,
        Parse_node const& node,
        std::pmr::polymorphic_allocator<> const& output_allocator
    )
    {
        h::Break_expression output{};
        
        auto count = get_child_node(tree, node, "Expression_break_loop_count");
        if (count.has_value())
        {
            auto count_str = get_node_value(count.value());
            output.loop_count = std::stoi(std::string(count_str));
        }
        
        return output;
    }

    static h::Continue_expression node_to_expression_continue()
    {
        return h::Continue_expression{};
    }

    static h::Cast_expression node_to_expression_cast(
        Parse_tree const& tree,
        Parse_node const& root,
        Parse_node const& node,
        std::pmr::polymorphic_allocator<> const& output_allocator
    )
    {
        h::Cast_expression output{};
        
        auto value = get_child_node(tree, node, "Expression");
        if (value.has_value())
        {
            output.value = node_to_expression(tree, root, value.value(), output_allocator);
        }
        
        auto type = get_child_node(tree, node, "Type");
        if (type.has_value())
        {
            output.type = node_to_type_reference(tree, root, type.value(), output_allocator);
        }
        
        auto cast_type = get_child_node(tree, node, "Expression_cast_type");
        if (cast_type.has_value())
        {
            auto cast_type_value = get_node_value(cast_type.value());
            output.cast_type = cast_type_value == "bitcast" ? h::Cast_type::BitCast : h::Cast_type::Numeric;
        }
        
        return output;
    }

    h::Access_array_expression node_to_expression_access_array(
        Module_info const& module_info,
        Parse_tree const& tree,
        Parse_node const& node,
        std::pmr::polymorphic_allocator<> const& output_allocator,
        std::pmr::polymorphic_allocator<> const& temporaries_allocator
    )
    {
        h::Access_array_expression output{};
        
        auto array = get_child_node(tree, node, "Expression_array");
        if (array.has_value())
        {
            output.array = node_to_expression(tree, root, array.value(), output_allocator);
        }
        
        auto index = get_child_node(tree, node, "Expression_index");
        if (index.has_value())
        {
            output.index = node_to_expression(tree, root, index.value(), output_allocator);
        }
        
        return output;
    }

    static h::Constant_array_expression node_to_expression_constant_array(
        Parse_tree const& tree,
        Parse_node const& root,
        Parse_node const& node,
        std::pmr::polymorphic_allocator<> const& output_allocator
    )
    {
        h::Constant_array_expression output{output_allocator};
        
        auto elements = get_child_node(tree, node, "Expression_create_array_elements");
        if (elements.has_value())
        {
            auto element_nodes = get_child_nodes(tree, elements.value(), output_allocator);
            for (auto const& elem : element_nodes)
            {
                output.array_data.push_back(node_to_expression(tree, root, elem, output_allocator));
            }
        }
        
        return output;
    }*/

    /*static h::Binary_operation get_binary_operation(std::string_view op)
    {
        if (op == "+") return h::Binary_operation::Add;
        if (op == "-") return h::Binary_operation::Subtract;
        if (op == "*") return h::Binary_operation::Multiply;
        if (op == "/") return h::Binary_operation::Divide;
        if (op == "%") return h::Binary_operation::Modulus;
        if (op == "==") return h::Binary_operation::Equal;
        if (op == "!=") return h::Binary_operation::Not_equal;
        if (op == "<") return h::Binary_operation::Less_than;
        if (op == "<=") return h::Binary_operation::Less_than_or_equal_to;
        if (op == ">") return h::Binary_operation::Greater_than;
        if (op == ">=") return h::Binary_operation::Greater_than_or_equal_to;
        if (op == "&&") return h::Binary_operation::Logical_and;
        if (op == "||") return h::Binary_operation::Logical_or;
        if (op == "&") return h::Binary_operation::Bitwise_and;
        if (op == "|") return h::Binary_operation::Bitwise_or;
        if (op == "^") return h::Binary_operation::Bitwise_xor;
        if (op == "<<") return h::Binary_operation::Bit_shift_left;
        if (op == ">>") return h::Binary_operation::Bit_shift_right;
        if (op == "has") return h::Binary_operation::Has;
        
        // Default case or error handling
        return h::Binary_operation::Add;
    }

    static std::optional<h::Binary_operation> get_assignment_operation(std::string_view op)
    {
        if (op == "=") return std::nullopt;
        if (op == "+=") return h::Binary_operation::Add;
        if (op == "-=") return h::Binary_operation::Subtract;
        if (op == "*=") return h::Binary_operation::Multiply;
        if (op == "/=") return h::Binary_operation::Divide;
        if (op == "%=") return h::Binary_operation::Modulus;
        if (op == "&=") return h::Binary_operation::Bitwise_and;
        if (op == "|=") return h::Binary_operation::Bitwise_or;
        if (op == "^=") return h::Binary_operation::Bitwise_xor;
        if (op == "<<=") return h::Binary_operation::Bit_shift_left;
        if (op == ">>=") return h::Binary_operation::Bit_shift_right;
        
        return std::nullopt;
    }

    static h::Unary_operation get_unary_operation(std::string_view op)
    {
        if (op == "!") return h::Unary_operation::Not;
        if (op == "~") return h::Unary_operation::Bitwise_not;
        if (op == "-") return h::Unary_operation::Minus;
        if (op == "++") return h::Unary_operation::Pre_increment;
        if (op == "--") return h::Unary_operation::Pre_decrement;
        if (op == "*") return h::Unary_operation::Indirection;
        if (op == "&") return h::Unary_operation::Address_of;

        // Default case or error handling
        return h::Unary_operation::Not;
    }

    static std::optional<std::string_view> extract_comments_from_node(Parse_node const& node)
    {
        auto comment_node = get_child_node(tree, node, "Comment_or_empty");
        if (!comment_node.has_value())
            return std::nullopt;

        return get_node_value(comment_node.value());
    }

    static h::Type_constructor_declaration node_to_type_constructor_declaration(
        Parse_tree const& tree,
        Parse_node const& root,
        Parse_node const& node,
        std::pmr::polymorphic_allocator<> const& output_allocator
    )
    {
        h::Type_constructor_declaration output{output_allocator};
        
        auto name = get_child_node(tree, node, "Type_constructor_name");
        if (name.has_value())
        {
            output.name = create_string(get_node_value(name.value()), output_allocator);
        }
        
        // Handle type parameters
        auto type_params = get_child_node(tree, node, "Type_constructor_type_parameters");
        if (type_params.has_value())
        {
            auto param_nodes = get_child_nodes(tree, type_params.value(), output_allocator);
            for (auto const& param : param_nodes)
            {
                auto param_name = get_child_node(tree, param, "Type_parameter_name");
                if (param_name.has_value())
                {
                    output.type_parameter_names.push_back(create_string(get_node_value(param_name.value()), output_allocator));
                }
            }
        }
        
        auto type = get_child_node(tree, node, "Type");
        if (type.has_value())
        {
            output.type = node_to_type_reference(tree, root, type.value(), output_allocator);
        }
        
        return output;
    }

    static h::Function_constructor_declaration node_to_function_constructor_declaration(
        Parse_tree const& tree,
        Parse_node const& root,
        Parse_node const& node,
        std::pmr::polymorphic_allocator<> const& output_allocator
    )
    {
        h::Function_constructor_declaration output{output_allocator};
        
        auto name = get_child_node(tree, node, "Function_constructor_name");
        if (name.has_value())
        {
            output.name = create_string(get_node_value(name.value()), output_allocator);
        }
        
        // Handle type parameters
        auto type_params = get_child_node(tree, node, "Function_constructor_type_parameters");
        if (type_params.has_value())
        {
            auto param_nodes = get_child_nodes(tree, type_params.value(), output_allocator);
            for (auto const& param : param_nodes)
            {
                auto param_name = get_child_node(tree, param, "Type_parameter_name");
                if (param_name.has_value())
                {
                    output.type_parameter_names.push_back(create_string(get_node_value(param_name.value()), output_allocator));
                }
            }
        }
        
        // Handle input parameters
        auto input_params = get_child_node(tree, node, "Function_constructor_input_parameters");
        if (input_params.has_value())
        {
            auto param_nodes = get_child_nodes(tree, input_params.value(), output_allocator);
            for (auto const& param : param_nodes)
            {
                auto name = get_child_node(tree, param, "Function_parameter_name");
                if (name.has_value())
                {
                    output.input_parameter_names.push_back(create_string(get_node_value(name.value()), output_allocator));
                }
                
                auto type = get_child_node(tree, param, "Type");
                if (type.has_value())
                {
                    output.type.input_parameter_types.push_back(node_to_type_reference(tree, root, type.value(), output_allocator));
                }
            }
        }
        
        // Handle output parameters
        auto output_params = get_child_node(tree, node, "Function_constructor_output_parameters");
        if (output_params.has_value())
        {
            auto param_nodes = get_child_nodes(tree, output_params.value(), output_allocator);
            for (auto const& param : param_nodes)
            {
                auto type = get_child_node(tree, param, "Type");
                if (type.has_value())
                {
                    output.type.output_parameter_types.push_back(node_to_type_reference(tree, root, type.value(), output_allocator));
                }
            }
        }
        
        return output;
    }

    static h::Module_reference node_to_module_reference(
        Parse_tree const& tree,
        Parse_node const& node,
        std::pmr::polymorphic_allocator<> const& output_allocator
    )
    {
        h::Module_reference output{};
        
        auto name = get_child_node(tree, node, "Module_name");
        if (name.has_value())
        {
            output.name = create_string(get_node_value(name.value()), output_allocator);
        }
        
        return output;
    }

    static h::Statement_block node_to_statement_block(
        Parse_tree const& tree,
        Parse_node const& root,
        Parse_node const& node,
        std::pmr::polymorphic_allocator<> const& output_allocator
    )
    {
        h::Statement_block output{output_allocator};
        
        auto statements = get_child_nodes(tree, node, output_allocator);
        for (auto const& stmt : statements)
        {
            output.statements.push_back(node_to_statement(tree, root, stmt, output_allocator));
        }
        
        return output;
    }

    static h::Declaration_list node_to_declaration_list(
        Parse_tree const& tree,
        Parse_node const& root,
        Parse_node const& node,
        std::pmr::polymorphic_allocator<> const& output_allocator
    )
    {
        h::Declaration_list output{output_allocator};
        
        auto declarations = get_child_nodes(tree, node, output_allocator);
        for (auto const& decl : declarations)
        {
            output.declarations.push_back(node_to_declaration(tree, root, decl, output_allocator));
        }
        
        return output;
    }*/
}
