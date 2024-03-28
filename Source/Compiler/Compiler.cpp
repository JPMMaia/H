module;

#include <llvm/IR/IRBuilder.h>
#include "llvm/IR/LegacyPassManager.h"
#include <llvm/IR/LLVMContext.h>
#include <llvm/IR/Module.h>
#include <llvm/IR/PassManager.h>
#include <llvm/IR/Verifier.h>
#include <llvm/MC/TargetRegistry.h>
#include <llvm/Passes/PassBuilder.h>
#include "llvm/Passes/StandardInstrumentations.h"
#include <llvm/Support/FileSystem.h>
#include <llvm/Support/Host.h>
#include <llvm/Support/TargetSelect.h>
#include <llvm/Support/raw_ostream.h>
#include <llvm/Target/TargetMachine.h>
#include <llvm/Target/TargetOptions.h>
#include "llvm/Transforms/InstCombine/InstCombine.h"
#include "llvm/Transforms/Scalar.h"
#include "llvm/Transforms/Scalar/GVN.h"
#include "llvm/Transforms/Scalar/Reassociate.h"
#include "llvm/Transforms/Scalar/SimplifyCFG.h"

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

import h.core;
import h.compiler.common;
import h.compiler.expressions;
import h.compiler.types;
import h.json_serializer;

namespace h::compiler
{
    template<typename T>
    concept Has_name = requires(T a)
    {
        { a.name } -> std::convertible_to<std::pmr::string>;
    };

    template<Has_name Type>
    std::pmr::unordered_map<std::pmr::string, std::size_t> create_name_to_index_map(
        std::span<Type const> const values,
        std::pmr::polymorphic_allocator<> const& output_allocator
    )
    {
        std::pmr::unordered_map<std::pmr::string, std::size_t> map{ output_allocator };
        map.reserve(values.size());

        for (std::size_t index = 0; index < values.size(); ++index)
        {
            Type const& declaration = values[index];
            map.insert(std::make_pair(declaration.name, index));
        }

        return map;
    }

    template<Has_name Type>
    Type const& get_value(
        std::string_view const name,
        std::span<Type const> const values
    )
    {
        auto location = std::find_if(values.begin(), values.end(), [name](Type const& value) { return value.name == name; });
        return *location;
    }

    llvm::GlobalValue::LinkageTypes to_linkage(
        Linkage const linkage
    )
    {
        switch (linkage)
        {
        case Linkage::External:
            return llvm::GlobalValue::LinkageTypes::ExternalLinkage;
        case Linkage::Private:
            return llvm::GlobalValue::LinkageTypes::PrivateLinkage;
        default:
            throw;
        }
    }

    llvm::FunctionType* to_function_type(
        llvm::LLVMContext& llvm_context,
        llvm::DataLayout const& llvm_data_layout,
        std::span<Type_reference const> const input_parameter_types,
        std::span<Type_reference const> const output_parameter_types,
        bool const is_var_arg,
        Type_database const& type_database,
        std::pmr::polymorphic_allocator<> const& temporaries_allocator
    )
    {
        std::pmr::vector<llvm::Type*> const llvm_input_parameter_types = type_references_to_llvm_types(llvm_context, llvm_data_layout, input_parameter_types, type_database, temporaries_allocator);
        std::pmr::vector<llvm::Type*> const llvm_output_parameter_types = type_references_to_llvm_types(llvm_context, llvm_data_layout, output_parameter_types, type_database, temporaries_allocator);

        llvm::Type* llvm_return_type = [&]() -> llvm::Type*
        {
            if (llvm_output_parameter_types.size() == 0)
                return llvm::Type::getVoidTy(llvm_context);

            if (llvm_output_parameter_types.size() == 1)
                return llvm_output_parameter_types.front();

            return llvm::StructType::create(llvm_output_parameter_types);
        }();

        return llvm::FunctionType::get(llvm_return_type, llvm_input_parameter_types, is_var_arg);
    }

    llvm::Function& to_function(
        Module const& core_module,
        llvm::FunctionType& llvm_function_type,
        Function_declaration const& function_declaration
    )
    {
        llvm::GlobalValue::LinkageTypes const linkage = to_linkage(function_declaration.linkage);

        std::string const mangled_name = mangle_name(core_module, function_declaration.name);

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

        if (llvm_function->arg_size() != function_declaration.input_parameter_names.size())
        {
            throw std::runtime_error{ "Function arguments size and provided argument names size do not match." };
        }

        for (unsigned argument_index = 0; argument_index < llvm_function->arg_size(); ++argument_index)
        {
            llvm::Argument* const argument = llvm_function->getArg(argument_index);
            std::pmr::string const& name = function_declaration.input_parameter_names[argument_index];
            argument->setName(name.c_str());
        }

        llvm_function->setCallingConv(llvm::CallingConv::C);

        return *llvm_function;
    }

    llvm::Function& create_function_declaration(
        llvm::LLVMContext& llvm_context,
        llvm::DataLayout const& llvm_data_layout,
        Module const& core_module,
        Function_declaration const& function_declaration,
        Type_database const& type_database,
        std::pmr::polymorphic_allocator<> const& temporaries_allocator
    )
    {
        llvm::FunctionType* const llvm_function_type = to_function_type(
            llvm_context,
            llvm_data_layout,
            function_declaration.type.input_parameter_types,
            function_declaration.type.output_parameter_types,
            function_declaration.type.is_variadic,
            type_database,
            temporaries_allocator
        );

        llvm::Function& llvm_function = to_function(
            core_module,
            *llvm_function_type,
            function_declaration
        );

        return llvm_function;
    }

    void create_function_definition(
        llvm::LLVMContext& llvm_context,
        llvm::DataLayout const& llvm_data_layout,
        llvm::Module& llvm_module,
        llvm::Function& llvm_function,
        Module const& core_module,
        Function_declaration const& function_declaration,
        Function_definition const& function_definition,
        std::span<Module const> const core_module_dependencies,
        Type_database const& type_database,
        std::pmr::polymorphic_allocator<> const& temporaries_allocator
    )
    {
        llvm::BasicBlock* const block = llvm::BasicBlock::Create(llvm_context, "entry", &llvm_function);

        llvm::IRBuilder<> llvm_builder{ block };

        std::pmr::vector<Block_info> block_infos;

        {
            std::pmr::vector<Value_and_type> function_arguments{ temporaries_allocator };
            function_arguments.reserve(llvm_function.arg_size());

            for (std::size_t argument_index = 0; argument_index < function_declaration.type.input_parameter_types.size(); ++argument_index)
            {
                llvm::Argument* const llvm_argument = llvm_function.getArg(argument_index);
                std::pmr::string const& name = function_declaration.input_parameter_names[argument_index];
                Type_reference const& core_type = function_declaration.type.input_parameter_types[argument_index];

                function_arguments.push_back({ .name = name, .value = llvm_argument, .type = core_type });
            }

            std::pmr::vector<Value_and_type> local_variables{ temporaries_allocator };
            local_variables.reserve(function_definition.statements.size());

            for (std::size_t statement_index = 0; statement_index < function_definition.statements.size(); ++statement_index)
            {
                Statement const& statement = function_definition.statements[statement_index];

                std::pmr::vector<Value_and_type> temporaries{ temporaries_allocator };
                temporaries.resize(statement.expressions.size());

                for (std::size_t index = 0; index < statement.expressions.size(); ++index)
                {
                    std::size_t const expression_index = statement.expressions.size() - 1 - index;
                    Expression const& expression = statement.expressions[expression_index];

                    Value_and_type const instruction = create_expression_value(
                        expression,
                        core_module,
                        statement,
                        llvm_context,
                        llvm_data_layout,
                        llvm_module,
                        llvm_builder,
                        &llvm_function,
                        block_infos,
                        function_arguments,
                        local_variables,
                        temporaries,
                        core_module_dependencies,
                        type_database,
                        temporaries_allocator
                    );

                    temporaries[expression_index] = instruction;
                }

                local_variables.push_back(temporaries.front());
            }
        }

        auto const return_void_is_missing = [&]() -> bool
        {
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
            llvm_builder.CreateRetVoid();
        }

        if (llvm::verifyFunction(llvm_function, &llvm::errs())) {
            llvm_function.dump();
            throw std::runtime_error{ std::format("Function '{}' from module '{}' is not valid!", function_declaration.name, core_module.name) };
        }
    }

    void add_module_definitions(
        llvm::LLVMContext& llvm_context,
        llvm::DataLayout const& llvm_data_layout,
        llvm::Module& llvm_module,
        Module const& core_module,
        std::span<Module const> const core_module_dependencies,
        Type_database const& type_database,
        std::pmr::polymorphic_allocator<> const& temporaries_allocator
    )
    {
        for (Function_definition const& definition : core_module.definitions.function_definitions)
        {
            Function_declaration const& declaration = *find_function_declaration(core_module, definition.name).value();

            llvm::Function* llvm_function = get_llvm_function(core_module, llvm_module, definition.name);
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
                core_module,
                declaration,
                definition,
                core_module_dependencies,
                type_database,
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

            if (target_machine->addPassesToEmitFile(pass_manager, output_stream, nullptr, llvm::CGFT_ObjectFile))
            {
                llvm::errs() << "target_machine can't emit a file of this type";
                throw std::runtime_error{ error_code.message() };
            }

            pass_manager.run(llvm_module);
        }
    }

    std::pmr::vector<Module> create_dependency_core_modules(
        Module const& core_module,
        std::pmr::unordered_map<std::pmr::string, std::filesystem::path> const& module_name_to_file_path_map
    )
    {
        std::pmr::vector<Module> modules;
        modules.reserve(core_module.dependencies.alias_imports.size());

        for (Import_module_with_alias const& alias_import : core_module.dependencies.alias_imports)
        {
            auto const location = module_name_to_file_path_map.find(alias_import.module_name);
            if (location == module_name_to_file_path_map.end())
            {
                throw std::runtime_error{ std::format("Could not find corresponding file of module '{}'", alias_import.module_name) };
            }

            std::filesystem::path const& file_path = location->second;

            if (!std::filesystem::exists(file_path))
            {
                throw std::runtime_error{ std::format("Module '{}' file '{}' does not exist!", alias_import.module_name, file_path.generic_string()) };
            }

            std::optional<Module> import_core_module = h::json::read_module_export_declarations(file_path);
            if (!import_core_module.has_value())
            {
                throw std::runtime_error{ std::format("Failed to read Module '{}' file '{}' as JSON.", alias_import.module_name, file_path.generic_string()) };
            }

            modules.push_back(std::move(import_core_module.value()));
        }

        return modules;
    }

    void add_dependency_module_declarations(
        llvm::LLVMContext& llvm_context,
        llvm::DataLayout const& llvm_data_layout,
        llvm::Module& llvm_module,
        Type_database const& type_database,
        Module const& core_module,
        std::span<Module const> const core_module_dependencies,
        std::pmr::polymorphic_allocator<> const& temporaries_allocator
    )
    {
        auto& llvm_function_list = llvm_module.getFunctionList();

        for (std::size_t alias_import_index = 0; alias_import_index < core_module.dependencies.alias_imports.size(); ++alias_import_index)
        {
            Import_module_with_alias const& alias_import = core_module.dependencies.alias_imports[alias_import_index];
            Module const& core_module_dependency = core_module_dependencies[alias_import_index];

            // TODO alias, enums and structs

            for (Function_declaration const& function_declaration : core_module_dependency.export_declarations.function_declarations)
            {
                auto const location = std::find_if(alias_import.usages.begin(), alias_import.usages.end(), [&](std::pmr::string const& usage) -> bool { return function_declaration.name == usage; });
                if (location != alias_import.usages.end())
                {
                    llvm::Function& llvm_function = create_function_declaration(
                        llvm_context,
                        llvm_data_layout,
                        core_module,
                        function_declaration,
                        type_database,
                        temporaries_allocator
                    );

                    llvm_function_list.push_back(&llvm_function);
                }
            }
        }
    }

    void add_module_function_declarations(
        llvm::LLVMContext& llvm_context,
        llvm::DataLayout const& llvm_data_layout,
        llvm::Module& llvm_module,
        Module const& core_module,
        std::span<Function_declaration const> const function_declarations,
        Type_database const& type_database,
        std::pmr::polymorphic_allocator<> const& temporaries_allocator
    )
    {
        auto& llvm_function_list = llvm_module.getFunctionList();

        for (Function_declaration const& function_declaration : function_declarations)
        {
            llvm::Function& llvm_function = create_function_declaration(
                llvm_context,
                llvm_data_layout,
                core_module,
                function_declaration,
                type_database,
                temporaries_allocator
            );

            llvm_function_list.push_back(&llvm_function);
        }
    }

    std::unique_ptr<llvm::Module> create_module(
        llvm::LLVMContext& llvm_context,
        std::string_view const target_triple,
        llvm::DataLayout const& llvm_data_layout,
        Module const& core_module,
        std::span<Module const> const core_module_dependencies,
        Type_database& type_database
    )
    {
        for (Module const& module_dependency : core_module_dependencies)
        {
            add_module_types(type_database, llvm_context, llvm_data_layout, module_dependency);
        }
        add_module_types(type_database, llvm_context, llvm_data_layout, core_module);

        std::unique_ptr<llvm::Module> llvm_module = std::make_unique<llvm::Module>(core_module.name.c_str(), llvm_context);
        llvm_module->setTargetTriple(target_triple);
        llvm_module->setDataLayout(llvm_data_layout);

        add_module_function_declarations(llvm_context, llvm_data_layout, *llvm_module, core_module, core_module.export_declarations.function_declarations, type_database, {});
        add_module_function_declarations(llvm_context, llvm_data_layout, *llvm_module, core_module, core_module.internal_declarations.function_declarations, type_database, {});

        add_dependency_module_declarations(llvm_context, llvm_data_layout, *llvm_module, type_database, core_module, core_module_dependencies, {});
        add_module_definitions(llvm_context, llvm_data_layout, *llvm_module, core_module, core_module_dependencies, type_database, {});

        if (llvm::verifyModule(*llvm_module, &llvm::errs()))
        {
            llvm_module->dump();
            throw std::runtime_error{ std::format("Module '{}' is not valid!", core_module.name) };
        }

        return llvm_module;
    }

    LLVM_data initialize_llvm()
    {
        // Initialize the target registry:
        llvm::InitializeAllTargetInfos();
        llvm::InitializeAllTargets();
        llvm::InitializeAllTargetMCs();
        llvm::InitializeAllAsmParsers();
        llvm::InitializeAllAsmPrinters();

        std::string target_triple = llvm::sys::getDefaultTargetTriple();

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
        llvm::DataLayout llvm_data_layout = target_machine->createDataLayout();

        std::unique_ptr<llvm::LLVMContext> llvm_context = std::make_unique<llvm::LLVMContext>();

        std::unique_ptr<llvm::LoopAnalysisManager> loop_analysis_manager = std::make_unique<llvm::LoopAnalysisManager>();
        std::unique_ptr<llvm::FunctionAnalysisManager> function_analysis_manager = std::make_unique<llvm::FunctionAnalysisManager>();
        std::unique_ptr<llvm::CGSCCAnalysisManager> cgscc_analysis_manager = std::make_unique<llvm::CGSCCAnalysisManager>();
        std::unique_ptr<llvm::ModuleAnalysisManager> module_analysis_manager = std::make_unique<llvm::ModuleAnalysisManager>();

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

        llvm::ModulePassManager module_pass_manager = pass_builder.buildPerModuleDefaultPipeline(llvm::OptimizationLevel::O2);

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
            }
        };
    }

    LLVM_module_data create_llvm_module(
        LLVM_data& llvm_data,
        Module const& core_module,
        std::pmr::unordered_map<std::pmr::string, std::filesystem::path> const& module_name_to_file_path_map
    )
    {
        Type_database type_database = create_type_database(*llvm_data.context);

        std::pmr::vector<Module> core_module_dependencies = create_dependency_core_modules(core_module, module_name_to_file_path_map);
        std::unique_ptr<llvm::Module> llvm_module = create_module(*llvm_data.context, llvm_data.target_triple, llvm_data.data_layout, core_module, core_module_dependencies, type_database);

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

    void write_to_file(
        LLVM_data const& llvm_data,
        LLVM_module_data const& llvm_module_data,
        std::filesystem::path const& output_file_path
    )
    {
        llvm::legacy::PassManager pass_manager;

        std::error_code error_code;
        llvm::raw_fd_ostream output_stream(output_file_path.generic_string(), error_code, llvm::sys::fs::OF_None);

        if (error_code)
        {
            std::string const error_message = error_code.message();
            llvm::errs() << "Could not open file: " << error_message;
            throw std::runtime_error{ error_message };
        }

        if (llvm_data.target_machine->addPassesToEmitFile(pass_manager, output_stream, nullptr, llvm::CGFT_ObjectFile))
        {
            std::string const error_message = error_code.message();
            llvm::errs() << "Target machine can't emit a file of this type: " << error_message;
            throw std::runtime_error{ error_message };
        }

        pass_manager.run(*llvm_module_data.module);
    }

    void generate_object_file(
        std::filesystem::path const& output_file_path,
        Module const& core_module,
        std::pmr::unordered_map<std::pmr::string, std::filesystem::path> const& module_name_to_file_path_map
    )
    {
        LLVM_data llvm_data = initialize_llvm();
        LLVM_module_data llvm_module_data = create_llvm_module(llvm_data, core_module, module_name_to_file_path_map);

        llvm_module_data.module->print(llvm::errs(), nullptr);

        write_to_file(llvm_data, llvm_module_data, output_file_path);
    }
}