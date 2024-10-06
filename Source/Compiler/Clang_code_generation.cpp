module;

#include <clang/AST/ASTContext.h>
#include <clang/AST/Decl.h>
#include <clang/AST/DeclBase.h>
#include <clang/AST/Type.h>
#include <clang/Basic/Builtins.h>
#include <clang/Basic/CodeGenOptions.h>
#include <clang/Basic/Diagnostic.h>
#include <clang/Basic/FileManager.h>
#include <clang/Basic/IdentifierTable.h>
#include <clang/Basic/SourceLocation.h>
#include <clang/Basic/SourceManager.h>
#include <clang/CodeGen/CodeGenABITypes.h>
#include <clang/CodeGen/CGFunctionInfo.h>
#include <clang/CodeGen/ModuleBuilder.h>
#include <llvm/IR/Function.h>
#include <llvm/IR/IRBuilder.h>
#include <clang/Lex/HeaderSearchOptions.h>
#include <clang/Lex/PreprocessorOptions.h>
#include <llvm/Support/VirtualFileSystem.h>

#include <cassert>
#include <compare>
#include <exception>
#include <string>
#include <string_view>
#include <unordered_map>
#include <variant>

module h.compiler.clang_code_generation;

import h.compiler.debug_info;
import h.compiler.instructions;
import h.compiler.types;
import h.core;
import h.core.declarations;

namespace h::compiler
{
    void add_clang_struct_declaration(
        std::pmr::unordered_map<std::pmr::string, clang::RecordDecl*>& clang_struct_declarations,
        clang::ASTContext& clang_ast_context,
        h::Struct_declaration const& struct_declaration
    )
    {
        clang::IdentifierInfo* struct_name = &clang_ast_context.Idents.get(struct_declaration.name.data());

        clang::RecordDecl* record_declaration = clang::RecordDecl::Create(
            clang_ast_context,
            clang::TTK_Struct,
            clang_ast_context.getTranslationUnitDecl(),
            clang::SourceLocation(),
            clang::SourceLocation(),
            struct_name
        );

        clang_struct_declarations.emplace(struct_declaration.name, record_declaration);
    }

    void add_clang_struct_definition(
        std::pmr::unordered_map<std::pmr::string, clang::RecordDecl*>& clang_struct_declarations,
        clang::ASTContext& clang_ast_context,
        h::Struct_declaration const& struct_declaration
    )
    {
        clang::RecordDecl* record_declaration = clang_struct_declarations.at(struct_declaration.name);

        for (std::size_t member_index = 0; member_index < struct_declaration.member_types.size(); ++member_index)
        {
            std::string_view const member_name = struct_declaration.member_names[member_index];
            //h::Type_reference const& member_type = struct_declaration.member_types[member_index];

            // TODO creating int types for now
            clang::QualType int_type = clang_ast_context.IntTy;
            clang::IdentifierInfo* field_name = &clang_ast_context.Idents.get(member_name);
            clang::FieldDecl* field = clang::FieldDecl::Create(
                clang_ast_context, record_declaration, clang::SourceLocation(), clang::SourceLocation(),
                field_name, int_type, nullptr, nullptr, false, clang::ICIS_NoInit);

            record_declaration->addDecl(field);
        }

        record_declaration->completeDefinition();
    }

    clang::QualType create_clang_function_proto_type(
        clang::ASTContext& clang_ast_context,
        h::Function_type const& function_type,
        Declaration_database const& declaration_database,
        Clang_declaration_database const& clang_declaration_database
    )
    {
        clang::QualType const return_type = create_type(
            clang_ast_context,
            function_type.output_parameter_types,
            declaration_database,
            clang_declaration_database
        );

        llvm::SmallVector<clang::QualType> input_parameter_types;

        for (std::size_t index = 0; index < function_type.input_parameter_types.size(); ++index)
        {
            h::Type_reference const& input_parameter_type_reference = function_type.input_parameter_types[index];

            clang::QualType const input_parameter_type = create_type(
                clang_ast_context,
                input_parameter_type_reference,
                declaration_database,
                clang_declaration_database
            );

            input_parameter_types.push_back(input_parameter_type);
        }

        clang::FunctionProtoType::ExtProtoInfo extra_info = {};
        extra_info.Variadic = false;

        clang::QualType const function_proto_type = clang_ast_context.getFunctionType(
            return_type,
            input_parameter_types,
            extra_info
        );

        return function_proto_type;
    }

    void add_clang_function_declaration(
        std::pmr::unordered_map<std::pmr::string, clang::FunctionDecl*>& clang_function_declarations,
        clang::ASTContext& clang_ast_context,
        h::Function_declaration const& function_declaration,
        Declaration_database const& declaration_database,
        Clang_declaration_database const& clang_declaration_database
    )
    {
        clang::SourceLocation function_declaration_start_location;
        clang::SourceLocation function_declaration_end_location;

        clang::DeclarationName const declaration_name{ &clang_ast_context.Idents.get(function_declaration.name.data()) };

        clang::QualType const function_proto_type = create_clang_function_proto_type(clang_ast_context, function_declaration.type, declaration_database, clang_declaration_database);

        clang::StorageClass const storage_class = clang::StorageClass::SC_None;

        bool const is_inline_specified = false;
        bool const is_constexpr = false;

        clang::TranslationUnitDecl* const translation_unit_declaration = clang_ast_context.getTranslationUnitDecl();

        clang::FunctionDecl* clang_function_declaration = clang::FunctionDecl::Create(
            clang_ast_context,
            translation_unit_declaration,
            function_declaration_start_location,
            function_declaration_end_location,
            declaration_name,
            function_proto_type,
            nullptr,
            storage_class,
            is_inline_specified,
            is_constexpr
        );

        {
            std::pmr::vector<clang::ParmVarDecl*> clang_parameters;
            clang_parameters.reserve(function_declaration.type.input_parameter_types.size());

            for (std::size_t index = 0; index < function_declaration.type.input_parameter_types.size(); ++index)
            {
                std::string_view const input_parameter_name = function_declaration.input_parameter_names[index];
                h::Type_reference const& input_parameter_type_reference = function_declaration.type.input_parameter_types[index];

                clang::IdentifierInfo* parameter_name = &clang_ast_context.Idents.get(input_parameter_name.data());
                clang::QualType parameter_type = create_type(clang_ast_context, input_parameter_type_reference, declaration_database, clang_declaration_database);
                clang::Expr* parameter_default_argument = nullptr;

                clang::SourceLocation parameter_start_location;
                clang::SourceLocation parameter_end_location;

                clang::ParmVarDecl* parameter = clang::ParmVarDecl::Create(
                    clang_ast_context,
                    clang_function_declaration,
                    parameter_start_location,
                    parameter_end_location,
                    parameter_name,
                    parameter_type,
                    nullptr,
                    clang::StorageClass::SC_None,
                    parameter_default_argument
                );

                clang_parameters.push_back(parameter);
            }

            if (!clang_parameters.empty())
            {
                clang_function_declaration->setParams(clang_parameters);
            }
        }

        clang_function_declarations.emplace(function_declaration.name, clang_function_declaration);
    }

    void add_clang_declarations(
        Clang_declaration_database& clang_declaration_database,
        clang::ASTContext& clang_ast_context,
        h::Module const& core_module,
        Declaration_database const& declaration_database
    )
    {
        auto iterator = clang_declaration_database.map.emplace(core_module.name, Clang_module_declarations{}).first;

        for (h::Struct_declaration const& struct_declaration : core_module.export_declarations.struct_declarations)
        {
            add_clang_struct_declaration(iterator->second.struct_declarations, clang_ast_context, struct_declaration);
        }

        for (h::Struct_declaration const& struct_declaration : core_module.internal_declarations.struct_declarations)
        {
            add_clang_struct_declaration(iterator->second.struct_declarations, clang_ast_context, struct_declaration);
        }

        for (h::Struct_declaration const& struct_declaration : core_module.export_declarations.struct_declarations)
        {
            add_clang_struct_definition(iterator->second.struct_declarations, clang_ast_context, struct_declaration);
        }

        for (h::Struct_declaration const& struct_declaration : core_module.internal_declarations.struct_declarations)
        {
            add_clang_struct_definition(iterator->second.struct_declarations, clang_ast_context, struct_declaration);
        }

        for (h::Function_declaration const& function_declaration : core_module.export_declarations.function_declarations)
        {
            add_clang_function_declaration(iterator->second.function_declarations, clang_ast_context, function_declaration, declaration_database, clang_declaration_database);
        }

        for (h::Function_declaration const& function_declaration : core_module.internal_declarations.function_declarations)
        {
            add_clang_function_declaration(iterator->second.function_declarations, clang_ast_context, function_declaration, declaration_database, clang_declaration_database);
        }
    }

    Clang_module_data create_clang_module_data(
        llvm::LLVMContext& llvm_context,
        Clang_data const& clang_data,
        h::Module const& core_module,
        std::span<h::Module const* const> const sorted_core_module_dependencies,
        Declaration_database const& declaration_database
    )
    {
        clang::ASTContext& clang_ast_context = clang_data.compiler_instance->getASTContext();

        std::unique_ptr<clang::CodeGenerator> code_generator
        {
            clang::CreateLLVMCodeGen(
                clang_data.compiler_instance->getDiagnostics(),
                core_module.name.data(),
                &clang_data.compiler_instance->getVirtualFileSystem(),
                clang_data.compiler_instance->getHeaderSearchOpts(),
                clang_data.compiler_instance->getPreprocessorOpts(),
                clang_data.compiler_instance->getCodeGenOpts(),
                llvm_context,
                nullptr
            )
        };
        code_generator->Initialize(clang_ast_context);
        assert(&code_generator->CGM() != nullptr);

        Clang_declaration_database clang_declaration_database;
        for (Module const* module_dependency : sorted_core_module_dependencies)
            add_clang_declarations(clang_declaration_database, clang_ast_context, *module_dependency, declaration_database);
        add_clang_declarations(clang_declaration_database, clang_ast_context, core_module, declaration_database);

        return Clang_module_data
        {
            .ast_context = clang_ast_context,
            .code_generator = std::move(code_generator),
            .declaration_database = std::move(clang_declaration_database),
        };
    }

    clang::CodeGen::CGFunctionInfo const& create_clang_function_info(
        Clang_module_data& clang_module_data,
        h::Function_type const& function_type,
        Declaration_database const& declaration_database
    )
    {
        clang::QualType clang_function_type = create_clang_function_proto_type(
            clang_module_data.ast_context,
            function_type,
            declaration_database,
            clang_module_data.declaration_database
        );

        clang::CanQualType clang_canonical_function_type = clang_module_data.ast_context.getCanonicalType(clang_function_type);
        clang::CanQual<clang::FunctionProtoType> clang_function_proto_type = clang_canonical_function_type->getAs<clang::FunctionProtoType>();

        return clang::CodeGen::arrangeFreeFunctionType(clang_module_data.code_generator->CGM(), clang_function_proto_type);
    }

    llvm::FunctionType* create_llvm_function_type(
        Clang_module_data& clang_module_data,
        h::Module const& core_module,
        std::string_view const function_name
    )
    {
        Clang_module_declarations const& module_declarations = clang_module_data.declaration_database.map.at(core_module.name.data());
        clang::FunctionDecl* const clang_function_declaration = module_declarations.function_declarations.at(function_name.data());
        return clang::CodeGen::convertFreeFunctionType(clang_module_data.code_generator->CGM(), clang_function_declaration);
    }

    void set_llvm_function_argument_names(
        Clang_module_data& clang_module_data,
        h::Module const& core_module,
        h::Function_declaration const& function_declaration,
        llvm::Function& llvm_function,
        Declaration_database const& declaration_database
    )
    {
        clang::CodeGen::CGFunctionInfo const& function_info = create_clang_function_info(clang_module_data, function_declaration.type, declaration_database);

        llvm::ArrayRef<clang::CodeGen::CGFunctionInfoArgInfo> const argument_infos = function_info.arguments();

        unsigned new_argument_index = 0;

        for (unsigned argument_info_index = 0; argument_info_index < argument_infos.size(); ++argument_info_index)
        {
            clang::CodeGen::CGFunctionInfoArgInfo const& argument_info = argument_infos[argument_info_index];

            std::pmr::string const& name = function_declaration.input_parameter_names[argument_info_index];

            clang::CodeGen::ABIArgInfo::Kind const kind = argument_info.info.getKind();

            switch (kind)
            {
                case clang::CodeGen::ABIArgInfo::Direct: {
                    llvm::Type* const new_type = argument_info.info.getCoerceToType();


                    if (new_type->isStructTy())
                    {
                        llvm::StructType* const new_struct_type = static_cast<llvm::StructType*>(new_type);

                        llvm::ArrayRef<llvm::Type*> const new_elements = new_struct_type->elements();

                        for (unsigned new_element_index = 0; new_element_index < new_elements.size(); ++new_element_index)
                        {
                            std::string const argument_name = std::format("arguments[{}].{}_{}", argument_info_index, name, new_element_index);
            
                            llvm::Argument* const argument = llvm_function.getArg(new_argument_index);
                            argument->setName(argument_name.c_str());

                            new_argument_index += 1;
                        }
                    }
                    else
                    {
                        std::string const argument_name = std::format("arguments[{}].{}", argument_info_index, name);
        
                        llvm::Argument* const argument = llvm_function.getArg(new_argument_index);
                        argument->setName(argument_name.c_str());

                        new_argument_index += 1;
                    }

                    break;
                }
                case clang::CodeGen::ABIArgInfo::Extend: {
                    break;
                }
                case clang::CodeGen::ABIArgInfo::Indirect: {
                    break;
                }
                case clang::CodeGen::ABIArgInfo::IndirectAliased: {
                    break;
                }
                case clang::CodeGen::ABIArgInfo::Ignore: {
                    break;
                }
                case clang::CodeGen::ABIArgInfo::Expand: {
                    break;
                }
                case clang::CodeGen::ABIArgInfo::CoerceAndExpand: {
                    break;
                }
                case clang::CodeGen::ABIArgInfo::InAlloca: {
                    break;
                }
            }
        }
    }

    std::pmr::vector<llvm::Value*> transform_arguments(
        llvm::LLVMContext& llvm_context,
        llvm::IRBuilder<>& llvm_builder,
        llvm::DataLayout const& llvm_data_layout,
        Clang_module_data& clang_module_data,
        h::Module const& core_module,
        h::Function_type const& function_type,
        std::span<llvm::Value* const> const original_arguments,
        Declaration_database const& declaration_database,
        Type_database const& type_database
    )
    {
        clang::CodeGen::CGFunctionInfo const& function_info = create_clang_function_info(clang_module_data, function_type, declaration_database);

        llvm::ArrayRef<clang::CodeGen::CGFunctionInfoArgInfo> const argument_infos = function_info.arguments();

        std::pmr::vector<llvm::Value*> transformed_arguments;

        for (unsigned argument_index = 0; argument_index < argument_infos.size(); ++argument_index)
        {
            clang::CodeGen::CGFunctionInfoArgInfo const& argument_info = argument_infos[argument_index];

            clang::CodeGen::ABIArgInfo::Kind const kind = argument_info.info.getKind();

            switch (kind)
            {
                case clang::CodeGen::ABIArgInfo::Direct: {
                    llvm::Type* const new_type = argument_info.info.getCoerceToType();

                    if (new_type->isStructTy())
                    {
                        llvm::StructType* const new_struct_type = static_cast<llvm::StructType*>(new_type);
                        llvm::ArrayRef<llvm::Type*> const new_elements = new_struct_type->elements();

                        llvm::Value* const original_argument = original_arguments[argument_index];

                        h::Type_reference const& original_argument_type = function_type.input_parameter_types[argument_index];
                        llvm::Type* const original_argument_llvm_type = type_reference_to_llvm_type(llvm_context, llvm_data_layout, core_module, original_argument_type, type_database);
                        llvm::Align const original_argument_alignment = llvm_data_layout.getABITypeAlign(original_argument_llvm_type);

                        for (unsigned new_element_index = 0; new_element_index < new_elements.size(); ++new_element_index)
                        {
                            std::array<llvm::Value*, 2> const indices
                            {
                                llvm::ConstantInt::get(llvm::Type::getInt32Ty(llvm_context), 0),
                                llvm::ConstantInt::get(llvm::Type::getInt32Ty(llvm_context), new_element_index),
                            };

                            llvm::Value* const pointer_to_element = llvm_builder.CreateInBoundsGEP(new_type, original_argument, indices);

                            llvm::Type* const element_type = new_elements[new_element_index];
                            llvm::Value* const loaded_element = llvm_builder.CreateAlignedLoad(element_type, pointer_to_element, original_argument_alignment);

                            transformed_arguments.push_back(loaded_element);
                        }
                    }
                    else
                    {
                        llvm::Value* const new_argument = original_arguments[argument_index];
                        transformed_arguments.push_back(new_argument);
                    }

                    break;
                }
                case clang::CodeGen::ABIArgInfo::Extend: {
                    break;
                }
                case clang::CodeGen::ABIArgInfo::Indirect: {
                    break;
                }
                case clang::CodeGen::ABIArgInfo::IndirectAliased: {
                    break;
                }
                case clang::CodeGen::ABIArgInfo::Ignore: {
                    break;
                }
                case clang::CodeGen::ABIArgInfo::Expand: {
                    break;
                }
                case clang::CodeGen::ABIArgInfo::CoerceAndExpand: {
                    break;
                }
                case clang::CodeGen::ABIArgInfo::InAlloca: {
                    break;
                }
            }
        }

        return transformed_arguments;

        /*clang::CodeGen::CGFunctionInfo const& FI = create_clang_function_info(clang_module_data, core_module, function_name);

        std::pmr::vector<llvm::Value*> transformedArgs;

        for (unsigned i = 0; i < FI.arg_size(); ++i) {
            const clang::CodeGen::CGFunctionInfoArgInfo& argInfo = FI.arguments()[i];
            llvm::Value* arg = arguments[i];

            switch (argInfo.info.getKind()) {
            case clang::CodeGen::ABIArgInfo::Direct: {
                // For 'Direct', we may need to handle type extension/truncation.
                llvm::Type* expectedType = argInfo.info.getCoerceToType();

                if (arg->getType() != expectedType) {
                    // Perform type casting (extension, truncation, etc.)
                    if (arg->getType()->isIntegerTy() && expectedType->isIntegerTy()) {
                        unsigned argBits = arg->getType()->getIntegerBitWidth();
                        unsigned expectedBits = expectedType->getIntegerBitWidth();

                        if (argBits < expectedBits) {
                            // Extend small integer types (e.g., char to int)
                            arg = Builder.CreateZExt(arg, expectedType);
                        }
                        else if (argBits > expectedBits) {
                            // Truncate larger integer types
                            arg = Builder.CreateTrunc(arg, expectedType);
                        }
                    }
                    else {
                        // Handle other types of casts (e.g., float to double)
                        arg = Builder.CreateBitCast(arg, expectedType);
                    }
                }
                transformedArgs.push_back(arg);
                break;
            }
            case clang::CodeGen::ABIArgInfo::Indirect: {
                // For 'Indirect', we need to pass a pointer to the argument
                llvm::Value* argPtr = Builder.CreateAlloca(arg->getType());
                Builder.CreateStore(arg, argPtr);
                transformedArgs.push_back(argPtr);
                break;
            }
            case clang::CodeGen::ABIArgInfo::Extend: {
                // For 'Extend', we need to zero-extend the integer type
                llvm::Type* expectedType = argInfo.info.getCoerceToType();
                arg = Builder.CreateZExt(arg, expectedType);
                transformedArgs.push_back(arg);
                break;
            }
            case clang::CodeGen::ABIArgInfo::Ignore: {
                // 'Ignore' means we skip this argument entirely
                break;
            }
            default: {
                llvm::errs() << "Unhandled ABIArgInfo kind!\n";
                break;
            }
            }
        }

        return transformedArgs;*/
    }

    llvm::Value* generate_function_call(
        llvm::LLVMContext& llvm_context,
        llvm::IRBuilder<>& llvm_builder,
        llvm::DataLayout const& llvm_data_layout,
        Clang_module_data& clang_module_data,
        h::Module const& core_module,
        h::Function_type const& function_type,
        llvm::Function& llvm_function,
        std::span<llvm::Value* const> const arguments,
        Declaration_database const& declaration_database,
        Type_database const& type_database
    )
    {
        std::pmr::vector<llvm::Value*> const transformed_arguments = transform_arguments(llvm_context, llvm_builder, llvm_data_layout, clang_module_data, core_module, function_type, arguments, declaration_database, type_database);

        llvm::Value* call_instruction = llvm_builder.CreateCall(&llvm_function, transformed_arguments);

        return call_instruction;
    }

    void set_function_input_parameter_debug_information(
        llvm::LLVMContext& llvm_context,
        llvm::DataLayout const& llvm_data_layout,
        h::Module const& core_module,
        h::Function_declaration const& function_declaration,
        std::size_t const input_parameter_index,
        llvm::BasicBlock& llvm_block,
        llvm::Value& alloca_instruction,
        Debug_info* debug_info
    )
    {
        if (debug_info == nullptr)
            return;

        std::pmr::string const& name = function_declaration.input_parameter_names[input_parameter_index];
        Type_reference const& core_type = function_declaration.type.input_parameter_types[input_parameter_index];
        
        Source_location const function_declaration_source_location =
            function_declaration.source_location.value_or(Source_location{});

        Source_location const parameter_source_location =
            function_declaration.input_parameter_source_locations.has_value() ?
            function_declaration.input_parameter_source_locations.value()[input_parameter_index] :
            function_declaration_source_location;

        llvm::DIType* const llvm_argument_debug_type = type_reference_to_llvm_debug_type(
            *debug_info->llvm_builder,
            llvm_data_layout,
            core_module,
            core_type,
            debug_info->type_database
        );

        llvm::DIScope* const debug_scope = get_debug_scope(*debug_info);

        llvm::DILocalVariable* debug_parameter_variable = debug_info->llvm_builder->createParameterVariable(
            debug_scope,
            name.c_str(),
            input_parameter_index + 1,
            debug_scope->getFile(),
            parameter_source_location.line,
            llvm_argument_debug_type,
            true
        );

        llvm::DILocation* const debug_location = llvm::DILocation::get(llvm_context, parameter_source_location.line, parameter_source_location.column, debug_scope);

        debug_info->llvm_builder->insertDeclare(
            &alloca_instruction,
            debug_parameter_variable,
            debug_info->llvm_builder->createExpression(),
            debug_location,
            &llvm_block
        );
    }

    std::pmr::vector<Value_and_type> generate_function_arguments(
        llvm::LLVMContext& llvm_context,
        llvm::IRBuilder<>& llvm_builder,
        llvm::DataLayout const& llvm_data_layout,
        Clang_module_data& clang_module_data,
        h::Module const& core_module,
        h::Function_declaration const& function_declaration,
        llvm::Function& llvm_function,
        llvm::BasicBlock& llvm_block,
        Declaration_database const& declaration_database,
        Type_database const& type_database,
        Debug_info* debug_info
    )
    {
        clang::CodeGen::CGFunctionInfo const& function_info = create_clang_function_info(clang_module_data, function_declaration.type, declaration_database);
        llvm::ArrayRef<clang::CodeGen::CGFunctionInfoArgInfo> const argument_infos = function_info.arguments();

        std::pmr::vector<Value_and_type> restored_arguments;
        restored_arguments.reserve(argument_infos.size());

        unsigned function_argument_index = 0;

        for (unsigned restored_argument_index = 0; restored_argument_index < argument_infos.size(); ++restored_argument_index)
        {
            clang::CodeGen::CGFunctionInfoArgInfo const& argument_info = argument_infos[restored_argument_index];

            clang::CodeGen::ABIArgInfo::Kind const kind = argument_info.info.getKind();

            std::pmr::string const& restored_argument_name = function_declaration.input_parameter_names[restored_argument_index];
            h::Type_reference const& restored_argument_type = function_declaration.type.input_parameter_types[restored_argument_index];
            llvm::Type* const restored_argument_llvm_type = type_reference_to_llvm_type(llvm_context, llvm_data_layout, core_module, restored_argument_type, type_database);
            llvm::Align const restored_argument_alignment = llvm_data_layout.getABITypeAlign(restored_argument_llvm_type);

            llvm::AllocaInst* const alloca_instruction = create_alloca_instruction(llvm_builder, llvm_data_layout, restored_argument_llvm_type, restored_argument_name.data());
            restored_arguments.push_back(Value_and_type{.name = restored_argument_name, .value = alloca_instruction, .type = restored_argument_type});

            set_function_input_parameter_debug_information(
                llvm_context,
                llvm_data_layout,
                core_module,
                function_declaration,
                restored_argument_index,
                llvm_block,
                *alloca_instruction,
                debug_info
            );

            switch (kind)
            {
                case clang::CodeGen::ABIArgInfo::Direct: {
                    llvm::Type* const function_argument_type = argument_info.info.getCoerceToType();

                    if (function_argument_type->isStructTy())
                    {
                        llvm::StructType* const function_argument_struct_type = static_cast<llvm::StructType*>(function_argument_type);
                        llvm::ArrayRef<llvm::Type*> const function_argument_elements = function_argument_struct_type->elements();


                        for (unsigned function_argument_element_index = 0; function_argument_element_index < function_argument_elements.size(); ++function_argument_element_index)
                        {
                            std::array<llvm::Value*, 2> const indices
                            {
                                llvm::ConstantInt::get(llvm::Type::getInt32Ty(llvm_context), 0),
                                llvm::ConstantInt::get(llvm::Type::getInt32Ty(llvm_context), function_argument_element_index),
                            };
                            llvm::Value* const pointer_to_restored_argument = llvm_builder.CreateInBoundsGEP(function_argument_type, alloca_instruction, indices);

                            llvm::Value* const function_argument = llvm_function.getArg(function_argument_index);
                            llvm_builder.CreateAlignedStore(function_argument, pointer_to_restored_argument, restored_argument_alignment);

                            function_argument_index += 1;
                        }
                    }
                    else
                    {
                        llvm::Value* const function_argument = llvm_function.getArg(function_argument_index);
                        llvm_builder.CreateAlignedStore(function_argument, alloca_instruction, restored_argument_alignment);
                        function_argument_index += 1;
                    }

                    break;
                }
                case clang::CodeGen::ABIArgInfo::Extend: {
                    break;
                }
                case clang::CodeGen::ABIArgInfo::Indirect: {
                    break;
                }
                case clang::CodeGen::ABIArgInfo::IndirectAliased: {
                    break;
                }
                case clang::CodeGen::ABIArgInfo::Ignore: {
                    break;
                }
                case clang::CodeGen::ABIArgInfo::Expand: {
                    break;
                }
                case clang::CodeGen::ABIArgInfo::CoerceAndExpand: {
                    break;
                }
                case clang::CodeGen::ABIArgInfo::InAlloca: {
                    break;
                }
            }
        }

        return restored_arguments;
    }

    clang::QualType create_type(
        clang::ASTContext& clang_ast_context,
        h::Type_reference const& type_reference,
        Declaration_database const& declaration_database,
        Clang_declaration_database const& clang_declaration_database
    )
    {
        if (std::holds_alternative<h::Fundamental_type>(type_reference.data))
        {
            h::Fundamental_type const fundamental_type = std::get<h::Fundamental_type>(type_reference.data);
            if (fundamental_type == h::Fundamental_type::C_int)
            {
                return clang_ast_context.IntTy;
            }
        }
        else if (std::holds_alternative<h::Integer_type>(type_reference.data))
        {
            h::Integer_type const integer_type = std::get<h::Integer_type>(type_reference.data);
            return clang_ast_context.getIntTypeForBitwidth(static_cast<unsigned>(integer_type.number_of_bits), integer_type.is_signed ? 1 : 0);
        }
        else if (std::holds_alternative<h::Custom_type_reference>(type_reference.data))
        {
            h::Custom_type_reference const custom_type_reference = std::get<h::Custom_type_reference>(type_reference.data);
            std::optional<h::Declaration> const declaration = h::find_declaration(
                declaration_database,
                custom_type_reference.module_reference.name,
                custom_type_reference.name
            );

            if (declaration.has_value())
            {
                if (std::holds_alternative<h::Struct_declaration const*>(declaration->data))
                {
                    Clang_module_declarations const& clang_declarations = clang_declaration_database.map.at(custom_type_reference.module_reference.name.data());
                    clang::RecordDecl* const record_declaration = clang_declarations.struct_declarations.at(custom_type_reference.name);

                    return clang_ast_context.getRecordType(record_declaration);
                }
            }
        }

        throw std::runtime_error{ "Clang_code_generation.create_type(): Not implemented!" };
    }

    clang::QualType create_type(
        clang::ASTContext& clang_ast_context,
        std::span<h::Type_reference const> const type_reference,
        Declaration_database const& declaration_database,
        Clang_declaration_database const& clang_declaration_database
    )
    {
        if (type_reference.size() == 0) {
            return clang_ast_context.VoidTy;
        }

        return create_type(clang_ast_context, type_reference[0], declaration_database, clang_declaration_database);
    }

    Clang_data create_clang_data(
        llvm::LLVMContext& llvm_context,
        llvm::Triple const& llvm_triple,
        unsigned int const optimization_level
    )
    {
        std::unique_ptr<clang::CompilerInstance> compiler_instance = std::make_unique<clang::CompilerInstance>();

        compiler_instance->createDiagnostics();

        compiler_instance->createFileManager();
        compiler_instance->createSourceManager(compiler_instance->getFileManager());

        std::shared_ptr<clang::TargetOptions> target_options = std::make_shared<clang::TargetOptions>();
        target_options->Triple = llvm_triple.str();
        clang::TargetInfo* target_info = clang::TargetInfo::CreateTargetInfo(compiler_instance->getDiagnostics(), target_options);
        compiler_instance->setTarget(target_info);

        compiler_instance->createFileManager();
        compiler_instance->createSourceManager(compiler_instance->getFileManager());

        clang::LangOptions language_options;
        std::vector<std::string> language_option_includes;
        clang::LangOptions::setLangDefaults(language_options, clang::Language::C, llvm_triple, language_option_includes, clang::LangStandard::Kind::lang_c17);

        compiler_instance->createPreprocessor(clang::TU_Complete);
        compiler_instance->getPreprocessorOpts().UsePredefines = false;

        compiler_instance->createASTContext();

        return Clang_data
        {
            .compiler_instance = std::move(compiler_instance),
        };
    }
}
