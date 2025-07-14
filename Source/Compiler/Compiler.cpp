module;

#include <clang/AST/Decl.h>
#include <llvm/Analysis/ConstantFolding.h>
#include <llvm/Bitcode/BitcodeWriter.h>
#include <llvm/IR/DIBuilder.h>
#include <llvm/IR/IRBuilder.h>
#include <llvm/IR/LegacyPassManager.h>
#include <llvm/IR/LLVMContext.h>
#include <llvm/IR/Module.h>
#include <llvm/IR/PassManager.h>
#include <llvm/IR/Verifier.h>
#include <llvm/MC/TargetRegistry.h>
#include <llvm/Passes/PassBuilder.h>
#include <llvm/Passes/StandardInstrumentations.h>
#include <llvm/Support/FileSystem.h>
#include <llvm/Support/TargetSelect.h>
#include <llvm/Support/raw_ostream.h>
#include <llvm/Target/TargetMachine.h>
#include <llvm/Target/TargetOptions.h>
#include <llvm/TargetParser/Host.h>
#include <llvm/Transforms/InstCombine/InstCombine.h>
#include <llvm/Transforms/Scalar.h>
#include <llvm/Transforms/Scalar/GVN.h>
#include <llvm/Transforms/Scalar/Reassociate.h>
#include <llvm/Transforms/Scalar/SimplifyCFG.h>

#include <bit>
#include <cassert>
#include <cstdlib>
#include <format>
#include <iostream>
#include <filesystem>
#include <memory>
#include <memory_resource>
#include <optional>
#include <ranges>
#include <span>
#include <string_view>
#include <unordered_map>
#include <variant>
#include <vector>

module h.compiler;

import h.common;
import h.core;
import h.core.declarations;
import h.core.types;
import h.compiler.analysis;
import h.compiler.clang_code_generation;
import h.compiler.clang_data;
import h.compiler.common;
import h.compiler.debug_info;
import h.compiler.diagnostic;
import h.compiler.expressions;
import h.compiler.instructions;
import h.compiler.types;
import h.json_serializer;
import h.parser.convertor;
import h.parser.parse_tree;
import h.parser.parser;

namespace h::compiler
{
    llvm::GlobalValue::LinkageTypes to_linkage(
        Linkage const linkage
    )
    {
        switch (linkage)
        {
        case Linkage::External:
            return llvm::GlobalValue::LinkageTypes::ExternalLinkage;
        case Linkage::Private:
        default:
            return llvm::GlobalValue::LinkageTypes::PrivateLinkage;
        }
    }

    static llvm::DISubroutineType* create_debug_function_type(
        llvm::DIBuilder& llvm_debug_builder,
        llvm::DataLayout const& llvm_data_layout,
        Module const& core_module,
        std::span<Type_reference const> const input_parameter_types,
        std::span<Type_reference const> const output_parameter_types,
        std::span<std::pmr::string const> const output_parameter_names,
        Debug_type_database const& debug_type_database,
        llvm::FunctionType const& llvm_function_type,
        Function_type const& function_type,
        std::pmr::polymorphic_allocator<> const& temporaries_allocator
    )
    {
        std::pmr::vector<llvm::DIType*> const llvm_input_parameter_debug_types = type_references_to_llvm_debug_types(llvm_debug_builder, llvm_data_layout, input_parameter_types, debug_type_database, temporaries_allocator);
        std::pmr::vector<llvm::DIType*> const llvm_output_parameter_debug_types = type_references_to_llvm_debug_types(llvm_debug_builder, llvm_data_layout, output_parameter_types, debug_type_database, temporaries_allocator);

        llvm::DIType* llvm_return_debug_type = [&]() -> llvm::DIType*
        {
            if (llvm_output_parameter_debug_types.size() == 0)
                return nullptr;

            if (llvm_output_parameter_debug_types.size() == 1)
                return llvm_output_parameter_debug_types.front();

            llvm::TypeSize const return_type_size = llvm_data_layout.getTypeSizeInBits(llvm_function_type.getReturnType());

            std::pmr::vector<llvm::Metadata*> return_type_member_debug_types{ temporaries_allocator };
            return_type_member_debug_types.reserve(llvm_output_parameter_debug_types.size());

            std::uint64_t current_offset_in_bits = 0;

            for (std::size_t index = 0; index < llvm_output_parameter_debug_types.size(); ++index)
            {
                llvm::DIType* const llvm_debug_type = llvm_output_parameter_debug_types[index];
                llvm::Type* const llvm_type = llvm_function_type.getParamType(index);
                std::pmr::string const& member_name = output_parameter_names[index];

                llvm::DIType* const llvm_member_debug_type = llvm_debug_builder.createMemberType(
                    llvm_debug_type->getScope(),
                    member_name.c_str(),
                    llvm_debug_type->getScope()->getFile(),
                    0,
                    llvm_data_layout.getTypeSizeInBits(llvm_type),
                    8,
                    current_offset_in_bits,
                    llvm::DINode::FlagZero,
                    llvm_debug_type
                );

                return_type_member_debug_types.push_back(llvm_member_debug_type);

                current_offset_in_bits += llvm_data_layout.getTypeSizeInBits(llvm_type);
            }

            return llvm_debug_builder.createStructType(
                llvm_output_parameter_debug_types[0]->getScope(),
                "Function_return_type",
                llvm_output_parameter_debug_types[0]->getScope()->getFile(),
                0,
                return_type_size,
                8,
                llvm::DINode::FlagZero,
                nullptr,
                llvm_debug_builder.getOrCreateArray(return_type_member_debug_types)
            );
        }();

        std::pmr::vector<llvm::Metadata*> parameter_debug_types{ temporaries_allocator };
        parameter_debug_types.reserve(1 + llvm_input_parameter_debug_types.size());
        parameter_debug_types.push_back(llvm_return_debug_type);
        parameter_debug_types.insert(parameter_debug_types.end(), llvm_input_parameter_debug_types.begin(), llvm_input_parameter_debug_types.end());

        return llvm_debug_builder.createSubroutineType(
            llvm_debug_builder.getOrCreateTypeArray(parameter_debug_types)
        );
    }

    llvm::Function& to_function(
        llvm::LLVMContext& llvm_context,
        Clang_module_data& clang_module_data,
        std::string_view const module_name,
        llvm::FunctionType& llvm_function_type,
        Function_declaration const& function_declaration,
        Declaration_database const& declaration_database
    )
    {
        llvm::GlobalValue::LinkageTypes const linkage = to_linkage(function_declaration.linkage);

        std::string const mangled_name = mangle_name(module_name, function_declaration.name, function_declaration.unique_name);

        llvm::Function* const llvm_function = llvm::Function::Create(
            &llvm_function_type,
            linkage,
            mangled_name.c_str(),
            nullptr
        );

        if (!llvm_function)
        {
            throw std::runtime_error{ "Could not create function." };
        }

        set_llvm_function_argument_names(
            clang_module_data,
            function_declaration,
            *llvm_function,
            declaration_database
        );

        llvm_function->setCallingConv(llvm::CallingConv::C);

        set_function_definition_attributes(llvm_context, clang_module_data, *llvm_function);

        return *llvm_function;
    }

    llvm::Function& create_function_declaration(
        llvm::LLVMContext& llvm_context,
        llvm::DataLayout const& llvm_data_layout,
        Clang_module_data& clang_module_data,
        Module const& core_module,
        Function_declaration const& function_declaration,
        Type_database& type_database,
        Declaration_database& declaration_database,
        std::pmr::polymorphic_allocator<> const& temporaries_allocator
    )
    {
        llvm::FunctionType* const llvm_function_type = create_llvm_function_type(
            clang_module_data,
            core_module.name,
            function_declaration.name
        );

        llvm::Function& llvm_function = to_function(
            llvm_context,
            clang_module_data,
            core_module.name,
            *llvm_function_type,
            function_declaration,
            declaration_database
        );

        return llvm_function;
    }

    std::optional<std::size_t> find_enum_value_index_with_statement(
        Enum_declaration const& declaration,
        std::size_t const end_index
    )
    {
        std::size_t index = end_index;

        while (index > 0)
        {
            index -= 1;

            Enum_value const& current_enum_value = declaration.values[index];
            if (current_enum_value.value.has_value())
                return index;
        }

        return std::nullopt;
    }

    llvm::Constant* create_enum_value_constant(
        Enum_declaration const& declaration,
        std::size_t const enum_value_index,
        Expression_parameters const& parameters
    )
    {
        llvm::IRBuilder<>& llvm_builder = parameters.llvm_builder;

        Enum_value const& enum_value = declaration.values[enum_value_index];

        if (enum_value.value.has_value())
        {
            return fold_statement_constant(
                enum_value.value.value(),
                parameters
            );
        }
        else
        {
            std::optional<std::size_t> const index = find_enum_value_index_with_statement(declaration, enum_value_index);
            if (!index.has_value())
                return llvm_builder.getInt32(0);

            Enum_value const& enum_value_with_statement = declaration.values[index.value()];

            llvm::Constant* const enum_value_with_statement_constant = fold_statement_constant(
                enum_value_with_statement.value.value(),
                parameters
            );

            llvm::ConstantInt* const difference = llvm_builder.getInt32(enum_value_index - index.value());

            llvm::Constant* enum_value_constant = llvm::ConstantFoldBinaryOpOperands(
                llvm::Instruction::BinaryOps::Add,
                enum_value_with_statement_constant,
                difference,
                parameters.llvm_data_layout
            );

            return enum_value_constant;
        }
    }

    std::pmr::vector<llvm::Constant*> create_enum_constants(
        Enum_declaration const& declaration,
        Expression_parameters const& parameters
    )
    {
        std::pmr::vector<llvm::Constant*> constants;
        constants.reserve(declaration.values.size());

        std::pmr::vector<Value_and_type> local_variables;
        local_variables.reserve(declaration.values.size());

        Expression_parameters new_parameters = parameters;

        for (std::size_t index = 0; index < declaration.values.size(); ++index)
        {
            Enum_value const& enum_value = declaration.values[index];

            new_parameters.local_variables = local_variables;

            llvm::Constant* const constant = create_enum_value_constant(
                declaration,
                index,
                new_parameters
            );

            local_variables.push_back(
                Value_and_type
                {
                    .name = enum_value.name,
                    .value = constant,
                    .type = create_integer_type_type_reference(32, true)
                }
            );

            constants.push_back(constant);
        }

        return constants;
    }

    void add_enum_constants(
        Enum_value_constants& enum_constants,
        std::span<Enum_declaration const> const declarations,
        Expression_parameters const& parameters
    )
    {
        for (Enum_declaration const& declaration : declarations)
        {
            // TODO mangle name
            enum_constants.map[declaration.name] = create_enum_constants(declaration, parameters);
        }
    }

    Enum_value_constants create_enum_value_constants_map(
        llvm::LLVMContext& llvm_context,
        llvm::DataLayout const& llvm_data_layout,
        llvm::Module& llvm_module,
        Clang_module_data& clang_module_data,
        Module const& core_module,
        std::pmr::unordered_map<std::pmr::string, Module> const& core_module_dependencies,
        Declaration_database& declaration_database,
        Type_database& type_database,
        std::pmr::polymorphic_allocator<> const& temporaries_allocator
    )
    {
        Enum_value_constants enum_value_constants;

        llvm::IRBuilder<> llvm_builder{ llvm_context };

        Expression_parameters const expression_parameters
        {
            .llvm_context = llvm_context,
            .llvm_data_layout = llvm_data_layout,
            .llvm_builder = llvm_builder,
            .llvm_parent_function = nullptr,
            .llvm_module = llvm_module,
            .clang_module_data = clang_module_data,
            .core_module = core_module,
            .core_module_dependencies = core_module_dependencies,
            .declaration_database = declaration_database,
            .type_database = type_database,
            .enum_value_constants = enum_value_constants,
            .blocks = {},
            .defer_expressions_per_block = {},
            .function_declaration = {},
            .function_arguments = {},
            .local_variables = {},
            .expression_type = std::nullopt,
            .debug_info = nullptr,
            .contract_options = Contract_options::Disabled,
            .source_position = {},
            .temporaries_allocator = temporaries_allocator,
        };

        for (std::pair<std::pmr::string const, Module> const& module : core_module_dependencies)
        {
            add_enum_constants(enum_value_constants, module.second.export_declarations.enum_declarations, expression_parameters);
            add_enum_constants(enum_value_constants, module.second.internal_declarations.enum_declarations, expression_parameters);
        }

        add_enum_constants(enum_value_constants, core_module.export_declarations.enum_declarations, expression_parameters);
        add_enum_constants(enum_value_constants, core_module.internal_declarations.enum_declarations, expression_parameters);

        return enum_value_constants;
    }

    void create_function_definition(
        llvm::LLVMContext& llvm_context,
        llvm::DataLayout const& llvm_data_layout,
        llvm::Module& llvm_module,
        llvm::Function& llvm_function,
        Clang_module_data& clang_module_data,
        Module const& core_module,
        Function_declaration const& function_declaration,
        Function_definition const& function_definition,
        std::pmr::unordered_map<std::pmr::string, Module> const& core_module_dependencies,
        Declaration_database& declaration_database,
        Type_database& type_database,
        Enum_value_constants const& enum_value_constants,
        Debug_info* debug_info,
        Compilation_options const& compilation_options,
        std::pmr::polymorphic_allocator<> const& temporaries_allocator
    )
    {
        llvm::BasicBlock* const block = llvm::BasicBlock::Create(llvm_context, "entry", &llvm_function);

        llvm::IRBuilder<> llvm_builder{ block };

        if (debug_info != nullptr)
        {
            llvm::DISubroutineType* const llvm_function_debug_type = create_debug_function_type(
                *debug_info->llvm_builder,
                llvm_data_layout,
                core_module,
                function_declaration.type.input_parameter_types,
                function_declaration.type.output_parameter_types,
                function_declaration.output_parameter_names,
                debug_info->type_database,
                *llvm_function.getFunctionType(),
                function_declaration.type,
                temporaries_allocator
            );

            llvm::StringRef const function_name = function_declaration.name.c_str();
            llvm::StringRef const mangled_function_name = llvm_function.getName();

            unsigned const line = function_declaration.source_location.has_value() ? function_declaration.source_location->line : 0;
            unsigned const scope_line = function_definition.source_location.has_value() ? function_definition.source_location->line : line;

            llvm::DISubprogram* const subprogram = debug_info->llvm_builder->createFunction(
                debug_info->main_llvm_compile_unit,
                function_name,
                mangled_function_name,
                debug_info->main_llvm_compile_unit->getFile(),
                line,
                llvm_function_debug_type,
                scope_line,
                llvm::DINode::FlagPrototyped,
                llvm::DISubprogram::SPFlagDefinition
            );

            llvm_function.setSubprogram(subprogram);

            push_debug_scope(*debug_info, subprogram);
            unset_debug_location(llvm_builder);
        }

        {
            std::pmr::vector<Block_info> block_infos;
            
            std::pmr::vector<std::pmr::vector<Statement>> defer_expressions_per_block;
            defer_expressions_per_block.push_back({});

            std::pmr::vector<Value_and_type> function_arguments = generate_function_arguments(
                llvm_context,
                llvm_builder,
                llvm_data_layout,
                clang_module_data,
                core_module,
                function_declaration,
                llvm_function,
                *block,
                declaration_database,
                type_database,
                debug_info
            );
            
            if (debug_info != nullptr)
            {
                Source_location const function_declaration_source_location = function_declaration.source_location.value_or(Source_location{});
                Source_location const function_definition_source_location = function_definition.source_location.value_or(function_declaration_source_location);

                set_debug_location(llvm_builder, *debug_info, function_definition_source_location.line, function_definition_source_location.column);
            }

            Expression_parameters const expression_parameters
            {
                .llvm_context = llvm_context,
                .llvm_data_layout = llvm_data_layout,
                .llvm_builder = llvm_builder,
                .llvm_parent_function = &llvm_function,
                .llvm_module = llvm_module,
                .clang_module_data = clang_module_data,
                .core_module = core_module,
                .core_module_dependencies = core_module_dependencies,
                .declaration_database = declaration_database,
                .type_database = type_database,
                .enum_value_constants = enum_value_constants,
                .blocks = block_infos,
                .defer_expressions_per_block = defer_expressions_per_block,
                .function_declaration = &function_declaration,
                .function_arguments = function_arguments,
                .local_variables = {},
                .expression_type = std::nullopt,
                .debug_info = debug_info,
                .contract_options = compilation_options.contract_options,
                .source_position = std::nullopt,
                .temporaries_allocator = temporaries_allocator,
            };

            bool const enable_function_contracts = compilation_options.contract_options != Contract_options::Disabled;

            if (enable_function_contracts)
            {
                create_function_preconditions(
                    llvm_context,
                    llvm_module,
                    llvm_function,
                    llvm_builder,
                    core_module,
                    function_declaration,
                    expression_parameters
                );
            }

            create_statement_values(function_definition.statements, expression_parameters, true);

            auto const return_void_is_missing = [&]() -> bool
            {
                if (!llvm_function.getReturnType()->isVoidTy())
                    return false;

                if (!function_definition.statements.empty())
                {
                    Statement const& statement = function_definition.statements.back();
                    if (!statement.expressions.empty())
                    {
                        Expression const& expression = statement.expressions[0];
                        if (std::holds_alternative<Return_expression>(expression.data))
                            return false;
                    }
                }

                return true;
            };

            if (return_void_is_missing())
            {
                create_function_postconditions(
                    llvm_context,
                    llvm_module,
                    llvm_function,
                    llvm_builder,
                    core_module,
                    function_declaration,
                    expression_parameters
                );
                llvm_builder.CreateRetVoid();
            }
        }

        // Delete the last block if it has no predecessors.
        // This can happen, for example, if the last statement of a function is a if expression that returns non-void.
        if (llvm_function.size() > 1)
        {
            llvm::BasicBlock& last_block = llvm_function.back();
            if (llvm::pred_empty(&last_block))
            {
                last_block.eraseFromParent();
            }
        }

        if (debug_info != nullptr)
            pop_debug_scope(*debug_info);

        set_function_definition_attributes(llvm_context, clang_module_data, llvm_function);

        if (llvm::verifyFunction(llvm_function, &llvm::errs())) {
            llvm::errs() << "\n Function body:\n";
            llvm_function.print(llvm::errs(), nullptr);
            throw std::runtime_error{ std::format("Function '{}' from module '{}' is not valid!", function_declaration.name, core_module.name) };
        }
    }

    void add_module_definitions(
        llvm::LLVMContext& llvm_context,
        llvm::DataLayout const& llvm_data_layout,
        llvm::Module& llvm_module,
        Clang_module_data& clang_module_data,
        Module const& core_module,
        std::pmr::unordered_map<std::pmr::string, Module> const& core_module_dependencies,
        std::optional<std::span<std::string_view const>> const functions_to_compile,
        Declaration_database& declaration_database,
        Type_database& type_database,
        Enum_value_constants const& enum_value_constants,
        Debug_info* const debug_info,
        Compilation_options const& compilation_options,
        std::pmr::polymorphic_allocator<> const& temporaries_allocator
    )
    {
        auto const should_compile = [functions_to_compile](Function_definition const& definition) -> bool
        {
            if (!functions_to_compile.has_value())
                return true;

            auto const predicate = [&](std::string_view const function_name) { return function_name == definition.name; };
            auto const location = std::find_if(functions_to_compile->begin(), functions_to_compile->end(), predicate);
            return location != functions_to_compile->end();
        };

        for (Function_definition const& definition : core_module.definitions.function_definitions)
        {
            if (!should_compile(definition))
                continue;

            Function_declaration const& declaration = *find_function_declaration(core_module, definition.name).value();

            llvm::Function* const llvm_function = get_llvm_function(core_module, llvm_module, definition.name);
            if (!llvm_function)
            {
                std::string_view const function_name = definition.name;
                std::string_view const module_name = llvm_module.getName();
                throw std::runtime_error{ std::format("Function '{}' not found in module '{}'.", function_name, module_name) };
            }

            create_function_definition(
                llvm_context,
                llvm_data_layout,
                llvm_module,
                *llvm_function,
                clang_module_data,
                core_module,
                declaration,
                definition,
                core_module_dependencies,
                declaration_database,
                type_database,
                enum_value_constants,
                debug_info,
                compilation_options,
                temporaries_allocator
            );
        }

        for (std::pair<h::Instance_call_key const, clang::FunctionDecl*> const& pair : clang_module_data.declaration_database.call_instances)
        {
            h::Instance_call_key const& key = pair.first;

            Function_expression const* function_expression = get_instance_call_function_expression(
                declaration_database,
                key
            );
            if (function_expression == nullptr)
                throw std::runtime_error{"Could not find instance call function expression!"};

            h::Function_declaration const& function_declaration = function_expression->declaration;

            llvm::Function* const llvm_function = get_llvm_function(key.module_name, llvm_module, function_declaration.name, function_declaration.unique_name);
            if (!llvm_function)
            {
                std::string_view const function_name = function_declaration.name;
                std::string_view const module_name = key.module_name;
                throw std::runtime_error{ std::format("Function '{}' not found in module '{}'.", function_name, module_name) };
            }

            h::Module const* instance_module = get_module(
                key.module_name,
                core_module,
                core_module_dependencies
            );
            if (instance_module == nullptr)
                throw std::runtime_error{ std::format("Could not find module '{}'", key.module_name) };

            create_function_definition(
                llvm_context,
                llvm_data_layout,
                llvm_module,
                *llvm_function,
                clang_module_data,
                *instance_module,
                function_declaration,
                function_expression->definition,
                core_module_dependencies,
                declaration_database,
                type_database,
                enum_value_constants,
                debug_info,
                compilation_options,
                temporaries_allocator
            );
        }
    }

    void generate_code(
        std::string_view const output_filename,
        llvm::Module& llvm_module
    )
    {
        // Initialize the target registry etc.
        llvm::InitializeAllTargetInfos();
        llvm::InitializeAllTargets();
        llvm::InitializeAllTargetMCs();
        llvm::InitializeAllAsmParsers();
        llvm::InitializeAllAsmPrinters();

        std::string const target_triple = llvm::sys::getDefaultTargetTriple();

        llvm::Target const& target = [&]() -> llvm::Target const&
        {
            std::string error;
            llvm::Target const* target = llvm::TargetRegistry::lookupTarget(target_triple, error);

            // Print an error and exit if we couldn't find the requested target.
            // This generally occurs if we've forgotten to initialise the
            // TargetRegistry or we have a bogus target triple.
            if (!target)
            {
                llvm::errs() << error;
                throw std::runtime_error{ error };
            }

            return *target;
        }();

        char const* const cpu = "generic";
        char const* const features = "";
        llvm::TargetOptions const target_options;
        std::optional<llvm::Reloc::Model> const code_model;
        llvm::TargetMachine* target_machine = target.createTargetMachine(target_triple, cpu, features, target_options, code_model);

        llvm_module.setTargetTriple(target_triple);
        llvm_module.setDataLayout(target_machine->createDataLayout());

        {
            llvm::legacy::PassManager pass_manager;

            std::error_code error_code;
            llvm::raw_fd_ostream output_stream(output_filename, error_code, llvm::sys::fs::OF_None);

            if (error_code)
            {
                llvm::errs() << "Could not open file: " << error_code.message();
                throw std::runtime_error{ error_code.message() };
            }

            if (target_machine->addPassesToEmitFile(pass_manager, output_stream, nullptr, llvm::CodeGenFileType::ObjectFile))
            {
                llvm::errs() << "target_machine can't emit a file of this type";
                throw std::runtime_error{ error_code.message() };
            }

            pass_manager.run(llvm_module);
        }
    }

    void create_dependency_core_modules(
        Module const& core_module,
        std::pmr::unordered_map<std::pmr::string, std::filesystem::path> const& module_name_to_file_path_map,
        std::pmr::unordered_map<std::pmr::string, h::Module>& core_module_dependencies
    )
    {
        for (Import_module_with_alias const& alias_import : core_module.dependencies.alias_imports)
        {
            if (core_module_dependencies.contains(alias_import.module_name))
                continue;

            auto const location = module_name_to_file_path_map.find(alias_import.module_name);
            if (location == module_name_to_file_path_map.end())
                throw std::runtime_error{ std::format("Could not find corresponding file of module '{}'", alias_import.module_name) };

            std::filesystem::path const& file_path = location->second;
            if (!std::filesystem::exists(file_path))
                throw std::runtime_error{ std::format("Module '{}' file '{}' does not exist!", alias_import.module_name, file_path.generic_string()) };

            std::optional<Module> import_core_module = read_core_module(file_path);
            if (!import_core_module.has_value())
                throw std::runtime_error{ std::format("Failed to read Module '{}' file '{}' as JSON.", alias_import.module_name, file_path.generic_string()) };

            core_module_dependencies.insert(std::make_pair(alias_import.module_name, std::move(import_core_module.value())));

            create_dependency_core_modules(core_module_dependencies.at(alias_import.module_name), module_name_to_file_path_map, core_module_dependencies);
        }
    }

    std::optional<h::Module> parse_and_convert(
        std::filesystem::path const input_file_path
    )
    {
        std::optional<std::pmr::string> input_content = h::common::get_file_contents(input_file_path);
        if (!input_content.has_value())
            return std::nullopt;

        h::parser::Parser parser = h::parser::create_parser();
        
        std::pmr::u8string utf_8_source{reinterpret_cast<char8_t const*>(input_content->data()), input_content->size()};
        h::parser::Parse_tree parse_tree = h::parser::parse(parser, std::move(utf_8_source));

        h::parser::Parse_node const root = get_root_node(parse_tree);

        std::optional<h::Module> core_module = h::parser::parse_node_to_module(
            parse_tree,
            root,
            input_file_path,
            {},
            {}
        );

        h::parser::destroy_tree(std::move(parse_tree));
        h::parser::destroy_parser(std::move(parser));

        return core_module;
    }

    std::pmr::unordered_map<std::pmr::string, h::Module> create_dependency_core_modules(
        Module const& core_module,
        std::pmr::unordered_map<std::pmr::string, std::filesystem::path> const& module_name_to_file_path_map
    )
    {
        std::pmr::unordered_map<std::pmr::string, h::Module> core_module_dependencies;
        core_module_dependencies.reserve(module_name_to_file_path_map.size() + 1);

        std::filesystem::path const builtin_file_path = BUILTIN_SOURCE_FILE_PATH;
        std::optional<h::Module> builtin_module = parse_and_convert(builtin_file_path);
        if (!builtin_module.has_value())
            throw std::runtime_error{"Failed to read builtin module!"};
        core_module_dependencies.insert(std::make_pair(builtin_module->name, std::move(builtin_module.value())));

        create_dependency_core_modules(core_module, module_name_to_file_path_map, core_module_dependencies);

        return core_module_dependencies;
    }

    void add_module_declarations(
        llvm::LLVMContext& llvm_context,
        llvm::DataLayout const& llvm_data_layout,
        llvm::Module& llvm_module,
        Clang_module_data& clang_module_data,
        Module const& core_module,
        std::pmr::unordered_map<std::pmr::string, Module> const& core_module_dependencies,
        std::span<Function_declaration const> const function_declarations,
        std::optional<std::span<std::pmr::string const> const> const functions_to_add,
        std::span<Global_variable_declaration const> const global_variable_declarations,
        Type_database& type_database,
        Declaration_database& declaration_database,
        std::pmr::polymorphic_allocator<> const& temporaries_allocator
    )
    {
        // Add function declarations:
        {
            auto& llvm_function_list = llvm_module.getFunctionList();

            for (Function_declaration const& function_declaration : function_declarations)
            {
                if (functions_to_add.has_value())
                {
                    auto const location = std::find_if(
                        functions_to_add->begin(),
                        functions_to_add->end(),
                        [&](std::pmr::string const& name) -> bool { return function_declaration.name == name; }
                    );

                    if (location == functions_to_add->end())
                        continue;
                }

                llvm::Function& llvm_function = create_function_declaration(
                    llvm_context,
                    llvm_data_layout,
                    clang_module_data,
                    core_module,
                    function_declaration,
                    type_database,
                    declaration_database,
                    temporaries_allocator
                );

                llvm_function_list.push_back(&llvm_function);
            }
        }

        // Add global variable declarations:
        {
            llvm::IRBuilder<> llvm_builder{ llvm_context };

            for (Global_variable_declaration const& global_variable_declaration : global_variable_declarations)
            {
                if (!global_variable_declaration.is_mutable)
                    continue;

                std::string const mangled_name = mangle_name(core_module, global_variable_declaration.name, global_variable_declaration.unique_name);

                // TODO initial value might not have been specified
                // If it is not specified, then use create_struct_member_default_value() ?
                // Or perhaps make the initial value required, and use create_struct_member_default_value in c header importer to force it
        
                Expression_parameters const expression_parameters
                {
                    .llvm_context = llvm_context,
                    .llvm_data_layout = llvm_data_layout,
                    .llvm_builder = llvm_builder,
                    .llvm_parent_function = nullptr,
                    .llvm_module = llvm_module,
                    .clang_module_data = clang_module_data,
                    .core_module = core_module,
                    .core_module_dependencies = core_module_dependencies,
                    .declaration_database = declaration_database,
                    .type_database = type_database,
                    .enum_value_constants = {},
                    .blocks = {},
                    .defer_expressions_per_block = {},
                    .function_declaration = {},
                    .function_arguments = {},
                    .local_variables = {},
                    .expression_type = std::nullopt,
                    .debug_info = nullptr,
                    .contract_options = Contract_options::Disabled,
                    .source_position = {},
                    .temporaries_allocator = temporaries_allocator,
                };

                Value_and_type const statement_value = create_statement_value(
                    global_variable_declaration.initial_value,
                    expression_parameters
                );

                llvm::Constant* const initial_value = fold_constant(statement_value.value, llvm_data_layout);
                
                std::optional<Type_reference> const type = global_variable_declaration.type.has_value() ? global_variable_declaration.type : statement_value.type;
                if (!type.has_value())
                    throw std::runtime_error{std::format("Cannot deduce type of '{}.{}'.", core_module.name, global_variable_declaration.name)};

                llvm::Type* const llvm_type = type_reference_to_llvm_type(
                    llvm_context,
                    llvm_data_layout,
                    *type,
                    type_database
                );

                new llvm::GlobalVariable(
                    llvm_module,
                    llvm_type,
                    false,
                    llvm::GlobalValue::ExternalLinkage, // TODO
                    initial_value,
                    mangled_name
                );
            }
        }
    }

    void add_instance_call_declarations(
        llvm::LLVMContext& llvm_context,
        llvm::Module& llvm_module,
        Clang_module_data& clang_module_data,
        Declaration_database& declaration_database,
        std::pmr::polymorphic_allocator<> const& temporaries_allocator
    )
    {
        auto& llvm_function_list = llvm_module.getFunctionList();

        for (std::pair<h::Instance_call_key const, clang::FunctionDecl*> const& pair : clang_module_data.declaration_database.call_instances)
        {
            h::Instance_call_key const& key = pair.first;
            clang::FunctionDecl* const clang_function_declaration = pair.second;

            Function_expression const* function_expression = get_instance_call_function_expression(
                declaration_database,
                key
            );
            if (function_expression == nullptr)
                throw std::runtime_error{"Could not find instance call function expression!"};

            h::Function_declaration const& function_declaration = function_expression->declaration;

            llvm::FunctionType* const llvm_function_type = convert_function_type(
                clang_module_data,
                clang_function_declaration
            );

            llvm::Function& llvm_function = to_function(
                llvm_context,
                clang_module_data,
                key.module_name,
                *llvm_function_type,
                function_declaration,
                declaration_database
            );

            llvm_function_list.push_back(&llvm_function);
        }
    }

    void add_dependency_module_declarations(
        llvm::LLVMContext& llvm_context,
        llvm::DataLayout const& llvm_data_layout,
        llvm::Module& llvm_module,
        Clang_module_data& clang_module_data,
        Type_database& type_database,
        Declaration_database& declaration_database,
        Module const& core_module,
        std::pmr::unordered_map<std::pmr::string, Module> const& core_module_dependencies,
        std::pmr::polymorphic_allocator<> const& temporaries_allocator
    )
    {
        for (std::pair<std::pmr::string const, Module> const& pair : core_module_dependencies)
        {
            Module const& core_module_dependency = pair.second;

            auto const alias_import_location = std::find_if(
                core_module.dependencies.alias_imports.begin(),
                core_module.dependencies.alias_imports.end(),
                [&](Import_module_with_alias const& import_alias) { return import_alias.module_name == core_module_dependency.name; }
            );

            if (alias_import_location != core_module.dependencies.alias_imports.end())
            {
                add_module_declarations(
                    llvm_context,
                    llvm_data_layout,
                    llvm_module,
                    clang_module_data,
                    core_module_dependency,
                    core_module_dependencies,
                    core_module_dependency.export_declarations.function_declarations,
                    alias_import_location->usages,
                    core_module_dependency.export_declarations.global_variable_declarations,
                    type_database,
                    declaration_database,
                    temporaries_allocator
                );
            }
        }
    }

    std::unique_ptr<Debug_info> create_debug_info(
        llvm::DataLayout const& llvm_data_layout,
        llvm::Module& llvm_module,
        Clang_module_data const& clang_module_data,
        Module const& core_module,
        std::pmr::unordered_map<std::pmr::string, Module> const& core_module_dependencies,
        Type_database& type_database,
        Enum_value_constants const& enum_value_constants,
        Compilation_options const& compilation_options
    )
    {
        if (!compilation_options.debug)
            return nullptr;

        llvm_module.addModuleFlag(
            llvm::Module::Warning,
            "Debug Info Version",
            llvm::LLVMConstants::DEBUG_METADATA_VERSION
        );

        std::unique_ptr<llvm::DIBuilder> llvm_debug_builder = std::make_unique<llvm::DIBuilder>(llvm_module);

        std::unordered_map<std::filesystem::path, llvm::DIFile*> llvm_debug_files;

        llvm::DIFile* const llvm_debug_file = llvm_debug_builder->createFile(core_module.source_file_path->filename().generic_string(), core_module.source_file_path->parent_path().generic_string());
        llvm_debug_files.emplace(*core_module.source_file_path, llvm_debug_file);

        llvm::DICompileUnit* const llvm_debug_compile_unit = llvm_debug_builder->createCompileUnit(
            llvm::dwarf::DW_LANG_C,
            llvm_debug_file,
            "Hlang Compiler",
            compilation_options.is_optimized,
            "",
            0
        );

        Debug_type_database debug_type_database = create_debug_type_database(
            *llvm_debug_builder,
            *llvm_debug_compile_unit,
            llvm_data_layout
        );

        add_module_debug_types(
            debug_type_database,
            *llvm_debug_builder,
            *llvm_debug_compile_unit,
            *llvm_debug_file,
            llvm_debug_files,
            llvm_data_layout,
            clang_module_data,
            core_module,
            enum_value_constants.map,
            type_database
        );

        for (std::pair<std::pmr::string const, Module> const& pair : core_module_dependencies)
        {
            Module const& module_dependency = pair.second;

            if (!module_dependency.source_file_path)
            {
                //h::common::print_message_and_exit(std::format("Module '{}' did not contain source file path for debugging!", module_dependency.name));
                continue;
            }

            llvm::DIFile* const llvm_dependency_debug_file = llvm_debug_builder->createFile(module_dependency.source_file_path->filename().generic_string(), module_dependency.source_file_path->parent_path().generic_string());
            llvm_debug_files.emplace(*core_module.source_file_path, llvm_dependency_debug_file);

            add_module_debug_types(
                debug_type_database,
                *llvm_debug_builder,
                *llvm_debug_compile_unit,
                *llvm_dependency_debug_file,
                llvm_debug_files,
                llvm_data_layout,
                clang_module_data,
                module_dependency,
                enum_value_constants.map,
                type_database
            );
        }

        if (!core_module.source_file_path)
            h::common::print_message_and_exit("Module did not contain source file path!");

        return std::make_unique<Debug_info>(
            std::move(llvm_debug_builder),
            std::move(debug_type_database),
            llvm_debug_compile_unit
        );
    }

    std::unique_ptr<llvm::Module> create_module(
        llvm::LLVMContext& llvm_context,
        std::string_view const target_triple,
        llvm::DataLayout const& llvm_data_layout,
        Clang_module_data& clang_module_data,
        Module const& core_module,
        std::pmr::unordered_map<std::pmr::string, Module> const& core_module_dependencies,
        std::optional<std::span<std::string_view const>> const functions_to_compile,
        Declaration_database& declaration_database,
        Type_database& type_database,
        Compilation_options const& compilation_options
    )
    {
        std::unique_ptr<llvm::Module> llvm_module = std::make_unique<llvm::Module>(core_module.name.c_str(), llvm_context);
        llvm_module->setTargetTriple(target_triple);
        llvm_module->setDataLayout(llvm_data_layout);

        add_module_declarations(llvm_context, llvm_data_layout, *llvm_module, clang_module_data, core_module, core_module_dependencies, core_module.export_declarations.function_declarations, std::nullopt, core_module.export_declarations.global_variable_declarations, type_database, declaration_database, {});
        add_module_declarations(llvm_context, llvm_data_layout, *llvm_module, clang_module_data, core_module, core_module_dependencies, core_module.internal_declarations.function_declarations, std::nullopt, core_module.internal_declarations.global_variable_declarations, type_database, declaration_database, {});
        add_instance_call_declarations(llvm_context, *llvm_module, clang_module_data, declaration_database, {});

        add_dependency_module_declarations(llvm_context, llvm_data_layout, *llvm_module, clang_module_data, type_database, declaration_database, core_module, core_module_dependencies, {});

        Enum_value_constants const enum_value_constants = create_enum_value_constants_map(
            llvm_context,
            llvm_data_layout,
            *llvm_module,
            clang_module_data,
            core_module,
            core_module_dependencies,
            declaration_database,
            type_database,
            {}
        );

        std::unique_ptr<Debug_info> debug_info = create_debug_info(
            llvm_data_layout,
            *llvm_module,
            clang_module_data,
            core_module,
            core_module_dependencies,
            type_database,
            enum_value_constants,
            compilation_options
        );

        add_module_definitions(
            llvm_context,
            llvm_data_layout,
            *llvm_module,
            clang_module_data,
            core_module,
            core_module_dependencies,
            functions_to_compile,
            declaration_database,
            type_database,
            enum_value_constants,
            debug_info.get(),
            compilation_options,
            {}
        );

        if (llvm::verifyModule(*llvm_module, &llvm::errs()))
        {
            llvm_module->print(llvm::errs(), nullptr);
            throw std::runtime_error{ std::format("Module '{}' is not valid!", core_module.name) };
        }

        if (debug_info != nullptr)
        {
            debug_info->llvm_builder->finalize();
        }

        return llvm_module;
    }

    std::optional<h::Module> read_core_module(
        std::filesystem::path const& path
    )
    {
        std::optional<Module> core_module = h::json::read_module(path);
        if (!core_module)
            return std::nullopt;

        return core_module;
    }

    std::optional<h::Module> read_core_module_declarations(
        std::filesystem::path const& path
    )
    {
        // TODO read only declarations
        return read_core_module(path);
    }

    LLVM_data initialize_llvm(
        Compilation_options const& options
    )
    {
        // Initialize the target registry:
        llvm::InitializeAllTargetInfos();
        llvm::InitializeAllTargets();
        llvm::InitializeAllTargetMCs();
        llvm::InitializeAllAsmParsers();
        llvm::InitializeAllAsmPrinters();

        std::string target_triple = options.target_triple.has_value() ? std::string{ *options.target_triple } : llvm::sys::getDefaultTargetTriple();

        llvm::Target const& target = [&]() -> llvm::Target const&
        {
            std::string error;
            llvm::Target const* target = llvm::TargetRegistry::lookupTarget(target_triple, error);

            // Print an error and exit if we couldn't find the requested target.
            // This generally occurs if we've forgotten to initialise the
            // TargetRegistry or we have a bogus target triple.
            if (!target)
            {
                llvm::errs() << error;
                throw std::runtime_error{ error };
            }

            return *target;
        }();

        char const* const cpu = "generic";
        char const* const features = "";
        llvm::TargetOptions const target_options;
        std::optional<llvm::Reloc::Model> const code_model;
        // TODO investigate JIT argument to createTargetMachine
        llvm::TargetMachine* target_machine = target.createTargetMachine(target_triple, cpu, features, target_options, code_model);

        // TODO set according to optimization level
        target_machine->setOptLevel(llvm::CodeGenOptLevel::Default);

        llvm::DataLayout llvm_data_layout = target_machine->createDataLayout();

        std::unique_ptr<llvm::LLVMContext> llvm_context = std::make_unique<llvm::LLVMContext>();

        std::unique_ptr<llvm::LoopAnalysisManager> loop_analysis_manager = std::make_unique<llvm::LoopAnalysisManager>();
        std::unique_ptr<llvm::FunctionAnalysisManager> function_analysis_manager = std::make_unique<llvm::FunctionAnalysisManager>();
        std::unique_ptr<llvm::CGSCCAnalysisManager> cgscc_analysis_manager = std::make_unique<llvm::CGSCCAnalysisManager>();
        std::unique_ptr<llvm::ModuleAnalysisManager> module_analysis_manager = std::make_unique<llvm::ModuleAnalysisManager>();

        // TODO set according to optimization level
        llvm::PassBuilder pass_builder;
        pass_builder.registerModuleAnalyses(*module_analysis_manager);
        pass_builder.registerCGSCCAnalyses(*cgscc_analysis_manager);
        pass_builder.registerFunctionAnalyses(*function_analysis_manager);
        pass_builder.registerLoopAnalyses(*loop_analysis_manager);
        pass_builder.crossRegisterProxies(
            *loop_analysis_manager,
            *function_analysis_manager,
            *cgscc_analysis_manager,
            *module_analysis_manager
        );

        llvm::OptimizationLevel const optimization_level = options.is_optimized ? llvm::OptimizationLevel::O2 : llvm::OptimizationLevel::O0;
        llvm::ModulePassManager module_pass_manager = pass_builder.buildPerModuleDefaultPipeline(optimization_level);

        Clang_data clang_data = create_clang_data(
            *llvm_context,
            llvm::Triple{ target_triple },
            options.is_optimized ? 2 : 0
        );

        return LLVM_data
        {
            .target_triple = std::move(target_triple),
            .target = &target,
            .target_machine = target_machine,
            .data_layout = std::move(llvm_data_layout),
            .context = std::move(llvm_context),
            .optimization_managers =
            {
                .loop_analysis_manager = std::move(loop_analysis_manager),
                .function_analysis_manager = std::move(function_analysis_manager),
                .cgscc_analysis_manager = std::move(cgscc_analysis_manager),
                .module_analysis_manager = std::move(module_analysis_manager),
                .module_pass_manager = std::move(module_pass_manager),
            },
            .clang_data = std::move(clang_data),
        };
    }

    std::pmr::vector<h::Module const*> sort_core_modules(
        std::pmr::unordered_map<std::pmr::string, h::Module> const& core_module_dependencies,
        std::pmr::polymorphic_allocator<> const& output_allocator,
        std::pmr::polymorphic_allocator<> const& temporaries_allocator
    )
    {
        std::pmr::vector<h::Module const*> remaining{ temporaries_allocator };
        remaining.reserve(core_module_dependencies.size());

        for (auto const& pair : core_module_dependencies)
        {
            remaining.push_back(&pair.second);
        }

        std::pmr::vector<h::Module const*> sorted{ output_allocator };
        sorted.reserve(core_module_dependencies.size());

        while (!remaining.empty())
        {
            for (std::size_t remaining_index = 0; remaining_index < remaining.size(); ++remaining_index)
            {
                h::Module const* core_module = remaining[remaining_index];

                bool const all_dependencies_are_in_sorted = std::all_of(
                    core_module->dependencies.alias_imports.begin(),
                    core_module->dependencies.alias_imports.end(),
                    [&](Import_module_with_alias const& alias_import) -> bool
                {
                    auto const location = std::find_if(sorted.begin(), sorted.end(), [&](h::Module const* sorted_module) -> bool { return sorted_module->name == alias_import.module_name; });
                    return location != sorted.end();
                }
                );

                if (all_dependencies_are_in_sorted)
                {
                    sorted.push_back(core_module);
                    remaining.erase(remaining.begin() + remaining_index);
                    break;
                }
            }
        }

        return sorted;
    }

    std::unique_ptr<llvm::Module> create_llvm_module(
        LLVM_data& llvm_data,
        Module const& core_module,
        std::pmr::unordered_map<std::pmr::string, Module> const& core_module_dependencies,
        std::optional<std::span<std::string_view const>> const functions_to_compile,
        Compilation_options const& compilation_options
    )
    {
        std::pmr::vector<h::Module const*> const sorted_core_module_dependencies = sort_core_modules(core_module_dependencies, {}, {});

        Declaration_database declaration_database = create_declaration_database();
        for (Module const* module_dependency : sorted_core_module_dependencies)
            add_declarations(declaration_database, *module_dependency);
        add_declarations(declaration_database, core_module);

        // TODO do this a different place so we can modify original
        Module new_core_module = core_module;
        add_import_usages(new_core_module, {});
        {
            Analysis_result const result = process_module(new_core_module, declaration_database, {}, {});
            if (!result.diagnostics.empty())
            {
                for (h::compiler::Diagnostic const& diagnostic : result.diagnostics)
                    std::cerr << h::compiler::diagnostic_to_string(diagnostic, {}, {}) << std::endl;
                
                throw std::runtime_error{"Failed to process module!"};
            }
        }

        std::pmr::vector<h::Module const*> all_core_modules{
            sorted_core_module_dependencies.begin(), sorted_core_module_dependencies.end()
        };
        all_core_modules.push_back(&new_core_module);
        Clang_module_data clang_module_data = create_clang_module_data(
            *llvm_data.context,
            llvm_data.clang_data,
            "Hl_clang_module",
            {},
            all_core_modules,
            declaration_database
        );

        Type_database type_database = create_type_database(*llvm_data.context);
        for (Module const* module_dependency : sorted_core_module_dependencies)
            add_module_types(type_database, *llvm_data.context, llvm_data.data_layout, clang_module_data, *module_dependency);
        add_module_types(type_database, *llvm_data.context, llvm_data.data_layout, clang_module_data, new_core_module);

        std::unique_ptr<llvm::Module> llvm_module = create_module(*llvm_data.context, llvm_data.target_triple, llvm_data.data_layout, clang_module_data, new_core_module, core_module_dependencies, functions_to_compile, declaration_database, type_database, compilation_options);
        
        optimize_llvm_module(llvm_data, *llvm_module);
        
        return llvm_module;
    }

    static void add_sorted_core_module(
        std::pmr::vector<h::Module const*>& sorted,
        h::Module const& core_module,
        std::span<h::Module const> const core_modules
    )
    {
        auto const location = std::find_if(
            sorted.begin(),
            sorted.end(),
            [&](h::Module const* current) -> bool { return current == &core_module; }
        );
        if (location != sorted.end())
            return;

        for (std::size_t import_index = 0; import_index < core_module.dependencies.alias_imports.size(); ++import_index)
        {
            Import_module_with_alias const& alias_import = core_module.dependencies.alias_imports[import_index];
            
            auto const location = std::find_if(
                core_modules.begin(),
                core_modules.end(),
                [&](h::Module const& current) -> bool { return current.name == alias_import.module_name; }
            );
            if (location == core_modules.end())
                continue;

            h::Module const& dependency_module = *location;

            add_sorted_core_module(
                sorted,
                dependency_module,
                core_modules
            );
        }

        sorted.push_back(&core_module);
    }

    std::pmr::vector<h::Module const*> sort_core_modules(
        std::span<h::Module const> const core_modules,
        std::pmr::polymorphic_allocator<> const& output_allocator,
        std::pmr::polymorphic_allocator<> const& temporaries_allocator
    )
    {
        std::pmr::vector<h::Module const*> sorted{ output_allocator };
        sorted.reserve(core_modules.size());

        for (std::size_t core_module_index = 0; core_module_index < core_modules.size(); ++core_module_index)
        {
            h::Module const& core_module = core_modules[core_module_index];

            add_sorted_core_module(
                sorted,
                core_module,
                core_modules
            );
        }

        assert(sorted.size() == core_modules.size());
        return sorted;
    }

    void add_import_usages(
        h::Module& core_module,
        std::pmr::polymorphic_allocator<> const& output_allocator
    )
    {
        for (Import_module_with_alias& alias_import : core_module.dependencies.alias_imports)
            alias_import.usages.clear();

        auto const add_unique_usage = [&](std::string_view const module_name, std::string_view const usage) -> void
        {
            if (module_name.empty())
                return;
    
            auto const location = std::find_if(
                core_module.dependencies.alias_imports.begin(),
                core_module.dependencies.alias_imports.end(),
                [&](Import_module_with_alias const& import_alias) -> bool { return import_alias.module_name == module_name; }
            );
            if (location != core_module.dependencies.alias_imports.end())
            {
                Import_module_with_alias& import_alias = *location;

                auto const usage_location = std::find(
                    import_alias.usages.begin(),
                    import_alias.usages.end(),
                    usage
                );
                if (usage_location == import_alias.usages.end())
                    import_alias.usages.push_back(std::pmr::string{ usage, std::move(output_allocator) });
            }
        };

        auto const process_type = [&](std::string_view const declaration_name, h::Type_reference const& type_reference) -> bool
        {
            if (std::holds_alternative<h::Custom_type_reference>(type_reference.data))
            {
                h::Custom_type_reference const& custom_type_reference = std::get<h::Custom_type_reference>(type_reference.data);
                add_unique_usage(custom_type_reference.module_reference.name, custom_type_reference.name);
            }

            return false;
        };

        h::visit_type_references(
            core_module,
            process_type
        );

        auto const process_expression = [&](h::Expression const& expression, h::Statement const& statement) -> bool
        {
            if (std::holds_alternative<h::Access_expression>(expression.data))
            {
                h::Access_expression const& access_expression = std::get<h::Access_expression>(expression.data);
                
                h::Expression const& left_hand_side = statement.expressions[access_expression.expression.expression_index];
                if (std::holds_alternative<h::Variable_expression>(left_hand_side.data))
                {
                    h::Variable_expression const& variable_expression = std::get<h::Variable_expression>(left_hand_side.data);

                    std::string_view const left_hand_side_name = variable_expression.name;

                    auto const location = std::find_if(
                        core_module.dependencies.alias_imports.begin(),
                        core_module.dependencies.alias_imports.end(),
                        [&](Import_module_with_alias const& import_alias) -> bool { return import_alias.alias == left_hand_side_name; }
                    );
                    if (location != core_module.dependencies.alias_imports.end())
                    {
                        Import_module_with_alias& import_alias = *location;
                        add_unique_usage(import_alias.module_name, access_expression.member_name);
                    }
                }
            }

            return false;
        };

        h::visit_expressions(
            core_module,
            process_expression
        );

        for (Import_module_with_alias& alias_import : core_module.dependencies.alias_imports)
            std::sort(alias_import.usages.begin(), alias_import.usages.end());
    }

    Declaration_database create_declaration_database_and_add_modules(
        std::span<h::Module const> const header_modules,
        std::span<h::Module const* const> const sorted_core_modules
    )
    {
        Declaration_database declaration_database = create_declaration_database();
        
        for (Module const& header_module : header_modules)
            add_declarations(declaration_database, header_module);

        for (Module const* core_module : sorted_core_modules)
            add_declarations(declaration_database, *core_module);

        return declaration_database;
    }

    Declaration_database_and_sorted_modules create_declaration_database_and_sorted_modules(
        std::span<h::Module const> const header_modules,
        std::span<h::Module> const core_modules,
        std::pmr::polymorphic_allocator<> const& output_allocator,
        std::pmr::polymorphic_allocator<> const& temporaries_allocator
    )
    {
        for (h::Module& core_module : core_modules)
            add_import_usages(core_module, output_allocator);

        std::pmr::unordered_map<std::string_view, std::pmr::vector<std::pmr::string>> usages_per_module;

        std::pmr::vector<h::Module const*> sorted_core_modules = sort_core_modules(
            core_modules,
            output_allocator,
            output_allocator
        );

        Declaration_database declaration_database = create_declaration_database_and_add_modules(
            header_modules,
            sorted_core_modules
        );

        // TODO can be done in parallel but declaration_database.call_instances needs to be guarded...
        for (Module& core_module : core_modules)
        {
            Analysis_result result = process_module(core_module, declaration_database, {}, temporaries_allocator);

            if (!result.diagnostics.empty())
            {
                return Declaration_database_and_sorted_modules
                {
                    .sorted_core_modules = std::move(sorted_core_modules),
                    .declaration_database = std::move(declaration_database),
                    .diagnostics = std::move(result.diagnostics),
                };
            }
        }

        return Declaration_database_and_sorted_modules
        {
            .sorted_core_modules = std::move(sorted_core_modules),
            .declaration_database = std::move(declaration_database),
            .diagnostics = {},
        };
    }

    Compilation_database process_modules_and_create_compilation_database(
        LLVM_data& llvm_data,
        std::span<h::Module const> const header_modules,
        std::span<h::Module> const core_modules,
        std::pmr::polymorphic_allocator<> const& output_allocator,
        std::pmr::polymorphic_allocator<> const& temporaries_allocator
    )
    {
        Declaration_database_and_sorted_modules declaration_database_and_sorted_modules = create_declaration_database_and_sorted_modules(
            header_modules,
            core_modules,
            output_allocator,
            temporaries_allocator
        );

        std::span<Diagnostic const> const diagnostics = declaration_database_and_sorted_modules.diagnostics;
        if (!diagnostics.empty())
        {
            for (std::size_t diagnostic_index = 0; diagnostic_index < diagnostics.size(); ++diagnostic_index)
            {
                Diagnostic const& diagnostic = diagnostics[diagnostic_index];

                std::pmr::string const diagnostic_string = diagnostic_to_string(
                    diagnostic,
                    temporaries_allocator,
                    temporaries_allocator
                );

                ::fprintf(stderr, "%s\n", diagnostic_string.c_str());
            }

            auto const is_error_diagnostic = [](Diagnostic const& diagnostic) -> bool
            {
                return diagnostic.severity == Diagnostic_severity::Error;
            };

            bool const contains_errors = std::any_of(
                diagnostics.begin(),
                diagnostics.end(),
                is_error_diagnostic
            );

            if (contains_errors)
                h::common::print_message_and_exit("Validation failed.");
        }
    
        std::span<h::Module const* const> const sorted_core_modules = declaration_database_and_sorted_modules.sorted_core_modules;
        Declaration_database declaration_database = std::move(declaration_database_and_sorted_modules.declaration_database);

        Clang_module_data clang_module_data = create_clang_module_data(
            *llvm_data.context,
            llvm_data.clang_data,
            "Hl_clang_module",
            header_modules,
            sorted_core_modules,
            declaration_database
        );

        Type_database type_database = create_type_database(*llvm_data.context);
        for (Module const& header_module : header_modules)
            add_module_types(type_database, *llvm_data.context, llvm_data.data_layout, clang_module_data, header_module);
        for (Module const* core_module : sorted_core_modules)
            add_module_types(type_database, *llvm_data.context, llvm_data.data_layout, clang_module_data, *core_module);

        return Compilation_database
        {
            .declaration_database = std::move(declaration_database),
            .clang_module_data = std::move(clang_module_data),
            .type_database = std::move(type_database),
        };
    }

    std::unique_ptr<llvm::Module> create_llvm_module(
        LLVM_data& llvm_data,
        h::Module const& core_module,
        std::pmr::unordered_map<std::pmr::string, std::filesystem::path> const& module_name_to_file_path_map,
        Compilation_database& compilation_database,
        Compilation_options const& compilation_options
    )
    {
        std::pmr::unordered_map<std::pmr::string, h::Module> core_module_dependencies = create_dependency_core_modules(
            core_module,
            module_name_to_file_path_map
        );

        std::unique_ptr<llvm::Module> llvm_module = create_module(
            *llvm_data.context,
            llvm_data.target_triple,
            llvm_data.data_layout,
            compilation_database.clang_module_data,
            core_module,
            core_module_dependencies,
            std::nullopt,
            compilation_database.declaration_database,
            compilation_database.type_database,
            compilation_options
        );
        
        optimize_llvm_module(llvm_data, *llvm_module);
        
        return llvm_module;
    }

    std::unique_ptr<llvm::Module> create_llvm_module(
        LLVM_data& llvm_data,
        Module const& core_module,
        std::pmr::unordered_map<std::pmr::string, Module> const& core_module_dependencies,
        Compilation_options const& compilation_options
    )
    {
        return create_llvm_module(llvm_data, core_module, core_module_dependencies, std::nullopt, compilation_options);
    }

    LLVM_module_data create_llvm_module(
        LLVM_data& llvm_data,
        Module const& core_module,
        std::pmr::unordered_map<std::pmr::string, std::filesystem::path> const& module_name_to_file_path_map,
        Compilation_options const& compilation_options
    )
    {
        std::pmr::unordered_map<std::pmr::string, h::Module> core_module_dependencies = create_dependency_core_modules(core_module, module_name_to_file_path_map);

        std::unique_ptr<llvm::Module> llvm_module = create_llvm_module(llvm_data, core_module, core_module_dependencies, compilation_options);

        return {
            .dependencies = std::move(core_module_dependencies),
            .module = std::move(llvm_module)
        };
    }

    void optimize_llvm_module(
        LLVM_data& llvm_data,
        llvm::Module& llvm_module
    )
    {
        llvm_data.optimization_managers.module_pass_manager.run(llvm_module, *llvm_data.optimization_managers.module_analysis_manager);
    }

    std::string to_string(
        llvm::Module const& llvm_module
    )
    {
        std::string output;
        llvm::raw_string_ostream stream{ output };
        llvm_module.print(stream, nullptr);
        return output;
    }

    void write_bitcode_to_file(
        LLVM_data const& llvm_data,
        llvm::Module& llvm_module,
        std::filesystem::path const& output_file_path
    )
    {
        std::error_code error_code;
        llvm::raw_fd_ostream output_stream(output_file_path.generic_string(), error_code, llvm::sys::fs::OF_None);

        if (error_code)
        {
            std::string const error_message = error_code.message();
            llvm::errs() << "Could not open file: " << error_message;
            throw std::runtime_error{ error_message };
        }

        llvm::WriteBitcodeToFile(llvm_module, output_stream);
    }

    void write_object_file(
        LLVM_data const& llvm_data,
        llvm::Module& llvm_module,
        std::filesystem::path const& output_file_path
    )
    {
        std::error_code error_code;
        llvm::raw_fd_ostream output_stream(output_file_path.generic_string(), error_code, llvm::sys::fs::OF_None);

        if (error_code)
        {
            std::string const error_message = error_code.message();
            llvm::errs() << "Could not open file: " << error_message;
            throw std::runtime_error{ error_message };
        }

        llvm::legacy::PassManager pass_manager;
        if (llvm_data.target_machine->addPassesToEmitFile(pass_manager, output_stream, nullptr, llvm::CodeGenFileType::ObjectFile))
        {
            std::string const error_message = error_code.message();
            llvm::errs() << "Could not emit object file: " << error_message;
            throw std::runtime_error{ error_message };
        }

        pass_manager.run(llvm_module);
    }

    void generate_object_file(
        std::filesystem::path const& output_file_path,
        Module const& core_module,
        std::pmr::unordered_map<std::pmr::string, std::filesystem::path> const& module_name_to_file_path_map,
        Compilation_options const& compilation_options
    )
    {
        LLVM_data llvm_data = initialize_llvm(compilation_options);
        LLVM_module_data llvm_module_data = create_llvm_module(llvm_data, core_module, module_name_to_file_path_map, compilation_options);

        llvm_module_data.module->print(llvm::errs(), nullptr);

        write_object_file(llvm_data, *llvm_module_data.module, output_file_path);
    }
}