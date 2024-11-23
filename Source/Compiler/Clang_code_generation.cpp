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
#include <clang/Basic/TargetInfo.h>
#include <clang/CodeGen/CodeGenABITypes.h>
#include <clang/CodeGen/CGFunctionInfo.h>
#include <clang/CodeGen/ModuleBuilder.h>
#include <llvm/ADT/APSInt.h>
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
    static constexpr std::string_view c_builtin_module_name = "H.Builtin";

    void add_clang_alias_type_declaration(
        std::pmr::unordered_map<std::pmr::string, clang::TypedefDecl*>& clang_alias_type_declarations,
        clang::ASTContext& clang_ast_context,
        h::Alias_type_declaration const& alias_type_declaration,
        Declaration_database const& declaration_database,
        Clang_declaration_database const& clang_declaration_database
    )
    {
        // TODO should we use unique_name?
        clang::IdentifierInfo* const alias_name = &clang_ast_context.Idents.get(alias_type_declaration.name.data());

        clang::QualType const underlying_type = *create_type(
            clang_ast_context,
            alias_type_declaration.type,
            declaration_database,
            clang_declaration_database
        );

        clang::TypedefDecl* const clang_alias_type_declaration = clang::TypedefDecl::Create(
            clang_ast_context,
            clang_ast_context.getTranslationUnitDecl(),
            clang::SourceLocation(),
            clang::SourceLocation(),
            alias_name,
            clang_ast_context.CreateTypeSourceInfo(underlying_type)
        );

        clang_alias_type_declarations.emplace(alias_type_declaration.name, clang_alias_type_declaration);
    }

    void add_clang_enum_declaration(
        std::pmr::unordered_map<std::pmr::string, clang::EnumDecl*>& clang_enum_declarations,
        clang::ASTContext& clang_ast_context,
        h::Enum_declaration const& enum_declaration
    )
    {
        // TODO should we use unique_name?
        clang::IdentifierInfo* const enum_name = &clang_ast_context.Idents.get(enum_declaration.name.data());

        clang::EnumDecl* const clang_enum_declaration = clang::EnumDecl::Create(
            clang_ast_context,
            clang_ast_context.getTranslationUnitDecl(),
            clang::SourceLocation(),
            clang::SourceLocation(),
            enum_name,
            nullptr,
            false,
            false,
            false
        );

        for (std::size_t value_index = 0; value_index < enum_declaration.values.size(); ++value_index)
        {
            h::Enum_value const& enum_value = enum_declaration.values[value_index];

            clang::IdentifierInfo* value_identifier = &clang_ast_context.Idents.get(enum_value.name.data());
            clang::EnumConstantDecl* clang_enum_value = clang::EnumConstantDecl::Create(
                clang_ast_context,
                clang_enum_declaration,
                clang::SourceLocation(),
                value_identifier,
                clang_ast_context.IntTy, // TODO
                nullptr,
                llvm::APSInt::get(0)
            );

            clang_enum_declaration->addDecl(clang_enum_value);
        }

        clang_enum_declaration->completeDefinition(
            clang_ast_context.IntTy,
            clang_ast_context.IntTy,
            0,
            32
        );

        clang_enum_declarations.emplace(enum_declaration.name, clang_enum_declaration);
    }

    void add_clang_struct_declaration(
        std::pmr::unordered_map<std::pmr::string, clang::RecordDecl*>& clang_struct_declarations,
        clang::ASTContext& clang_ast_context,
        h::Struct_declaration const& struct_declaration
    )
    {
        clang::IdentifierInfo* const struct_name = &clang_ast_context.Idents.get(struct_declaration.name.data());

        clang::RecordDecl* const record_declaration = clang::RecordDecl::Create(
            clang_ast_context,
            clang::TagTypeKind::Struct,
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
        h::Struct_declaration const& struct_declaration,
        Declaration_database const& declaration_database,
        Clang_declaration_database const& clang_declaration_database
    )
    {
        clang::RecordDecl* record_declaration = clang_struct_declarations.at(struct_declaration.name);

        for (std::size_t member_index = 0; member_index < struct_declaration.member_types.size(); ++member_index)
        {
            std::string_view const member_name = struct_declaration.member_names[member_index];
            h::Type_reference const& member_type = struct_declaration.member_types[member_index];

            clang::QualType const member_clang_type = *create_type(
                clang_ast_context,
                member_type,
                declaration_database,
                clang_declaration_database
            );

            clang::IdentifierInfo* field_name = &clang_ast_context.Idents.get(member_name);
            clang::FieldDecl* field = clang::FieldDecl::Create(
                clang_ast_context,
                record_declaration,
                clang::SourceLocation(),
                clang::SourceLocation(),
                field_name,
                member_clang_type,
                nullptr,
                nullptr,
                false,
                clang::ICIS_NoInit
            );

            record_declaration->addDecl(field);
        }

        record_declaration->completeDefinition();
    }

    void add_clang_union_declaration(
        std::pmr::unordered_map<std::pmr::string, clang::RecordDecl*>& clang_union_declarations,
        clang::ASTContext& clang_ast_context,
        h::Union_declaration const& union_declaration
    )
    {
        clang::IdentifierInfo* const union_name = &clang_ast_context.Idents.get(union_declaration.name.data());

        clang::RecordDecl* const record_declaration = clang::RecordDecl::Create(
            clang_ast_context,
            clang::TagTypeKind::Union,
            clang_ast_context.getTranslationUnitDecl(),
            clang::SourceLocation(),
            clang::SourceLocation(),
            union_name
        );

        clang_union_declarations.emplace(union_declaration.name, record_declaration);
    }

    void add_clang_union_definition(
        std::pmr::unordered_map<std::pmr::string, clang::RecordDecl*>& clang_union_declarations,
        clang::ASTContext& clang_ast_context,
        h::Union_declaration const& union_declaration,
        Declaration_database const& declaration_database,
        Clang_declaration_database const& clang_declaration_database
    )
    {
        clang::RecordDecl* record_declaration = clang_union_declarations.at(union_declaration.name);

        for (std::size_t member_index = 0; member_index < union_declaration.member_types.size(); ++member_index)
        {
            std::string_view const member_name = union_declaration.member_names[member_index];
            h::Type_reference const& member_type = union_declaration.member_types[member_index];

            clang::QualType const member_clang_type = *create_type(
                clang_ast_context,
                member_type,
                declaration_database,
                clang_declaration_database
            );

            clang::IdentifierInfo* field_name = &clang_ast_context.Idents.get(member_name);
            clang::FieldDecl* field = clang::FieldDecl::Create(
                clang_ast_context,
                record_declaration,
                clang::SourceLocation(),
                clang::SourceLocation(),
                field_name,
                member_clang_type,
                nullptr,
                nullptr,
                false,
                clang::ICIS_NoInit
            );

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
        clang::QualType const return_type = *create_type(
            clang_ast_context,
            function_type.output_parameter_types,
            declaration_database,
            clang_declaration_database
        );

        llvm::SmallVector<clang::QualType> input_parameter_types;

        for (std::size_t index = 0; index < function_type.input_parameter_types.size(); ++index)
        {
            h::Type_reference const& input_parameter_type_reference = function_type.input_parameter_types[index];

            clang::QualType const input_parameter_type = *create_type(
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
                clang::QualType parameter_type = *create_type(clang_ast_context, input_parameter_type_reference, declaration_database, clang_declaration_database);
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

        for (h::Enum_declaration const& enum_declaration : core_module.export_declarations.enum_declarations)
        {
            add_clang_enum_declaration(iterator->second.enum_declarations, clang_ast_context, enum_declaration);
        }

        for (h::Enum_declaration const& enum_declaration : core_module.internal_declarations.enum_declarations)
        {
            add_clang_enum_declaration(iterator->second.enum_declarations, clang_ast_context, enum_declaration);
        }

        for (h::Struct_declaration const& struct_declaration : core_module.export_declarations.struct_declarations)
        {
            add_clang_struct_declaration(iterator->second.struct_declarations, clang_ast_context, struct_declaration);
        }

        for (h::Struct_declaration const& struct_declaration : core_module.internal_declarations.struct_declarations)
        {
            add_clang_struct_declaration(iterator->second.struct_declarations, clang_ast_context, struct_declaration);
        }

        for (h::Union_declaration const& union_declaration : core_module.export_declarations.union_declarations)
        {
            add_clang_union_declaration(iterator->second.union_declarations, clang_ast_context, union_declaration);
        }

        for (h::Union_declaration const& union_declaration : core_module.internal_declarations.union_declarations)
        {
            add_clang_union_declaration(iterator->second.union_declarations, clang_ast_context, union_declaration);
        }

        for (h::Alias_type_declaration const& alias_type_declaration : core_module.export_declarations.alias_type_declarations)
        {
            add_clang_alias_type_declaration(iterator->second.alias_type_declarations, clang_ast_context, alias_type_declaration, declaration_database, clang_declaration_database);
        }

        for (h::Alias_type_declaration const& alias_type_declaration : core_module.internal_declarations.alias_type_declarations)
        {
            add_clang_alias_type_declaration(iterator->second.alias_type_declarations, clang_ast_context, alias_type_declaration, declaration_database, clang_declaration_database);
        }

        for (h::Struct_declaration const& struct_declaration : core_module.export_declarations.struct_declarations)
        {
            add_clang_struct_definition(iterator->second.struct_declarations, clang_ast_context, struct_declaration, declaration_database, clang_declaration_database);
        }

        for (h::Struct_declaration const& struct_declaration : core_module.internal_declarations.struct_declarations)
        {
            add_clang_struct_definition(iterator->second.struct_declarations, clang_ast_context, struct_declaration, declaration_database, clang_declaration_database);
        }

        for (h::Union_declaration const& union_declaration : core_module.export_declarations.union_declarations)
        {
            add_clang_union_definition(iterator->second.union_declarations, clang_ast_context, union_declaration, declaration_database, clang_declaration_database);
        }

        for (h::Union_declaration const& union_declaration : core_module.internal_declarations.union_declarations)
        {
            add_clang_union_definition(iterator->second.union_declarations, clang_ast_context, union_declaration, declaration_database, clang_declaration_database);
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
                    throw std::runtime_error{ "Clang_code_generation.set_llvm_function_argument_names(): Extend not implemented!" };
                }
                case clang::CodeGen::ABIArgInfo::Indirect: {
                    std::string const argument_name = std::format("arguments[{}].{}", argument_info_index, name);
    
                    llvm::Argument* const argument = llvm_function.getArg(new_argument_index);
                    argument->setName(argument_name.c_str());
                    argument->addAttr(llvm::Attribute::NoUndef);

                    new_argument_index += 1;
                    break;
                }
                case clang::CodeGen::ABIArgInfo::IndirectAliased: {
                    throw std::runtime_error{ "Clang_code_generation.set_llvm_function_argument_names(): IndirectAliased not implemented!" };
                }
                case clang::CodeGen::ABIArgInfo::Ignore: {
                    break;
                }
                case clang::CodeGen::ABIArgInfo::Expand: {
                    throw std::runtime_error{ "Clang_code_generation.set_llvm_function_argument_names(): Expand not implemented!" };
                }
                case clang::CodeGen::ABIArgInfo::CoerceAndExpand: {
                    throw std::runtime_error{ "Clang_code_generation.set_llvm_function_argument_names(): CoerceAndExpand not implemented!" };
                }
                case clang::CodeGen::ABIArgInfo::InAlloca: {
                    throw std::runtime_error{ "Clang_code_generation.set_llvm_function_argument_names(): InAlloca not implemented!" };
                }
            }
        }
    }

    Transformed_arguments transform_arguments(
        llvm::LLVMContext& llvm_context,
        llvm::IRBuilder<>& llvm_builder,
        llvm::DataLayout const& llvm_data_layout,
        llvm::Module& llvm_module,
        h::Module const& core_module,
        h::Function_type const& function_type,
        clang::CodeGen::CGFunctionInfo const& function_info,
        std::span<llvm::Value* const> const original_arguments,
        Type_database const& type_database
    )
    {
        Transformed_arguments transformed_arguments;

        if (function_type.output_parameter_types.size() > 0)
        {
            clang::CodeGen::ABIArgInfo const& return_info = function_info.getReturnInfo();
            clang::CodeGen::ABIArgInfo::Kind const kind = return_info.getKind();

            switch (kind)
            {
                case clang::CodeGen::ABIArgInfo::Direct:
                case clang::CodeGen::ABIArgInfo::Ignore: {
                    break;
                }
                case clang::CodeGen::ABIArgInfo::Indirect: {

                    // Pass return type as argument pointer

                    h::Type_reference const& original_return_type = function_type.output_parameter_types[0];
                    llvm::Type* const original_return_llvm_type = type_reference_to_llvm_type(llvm_context, llvm_data_layout, core_module, original_return_type, type_database);
                    llvm::Align const original_return_alignment = llvm_data_layout.getABITypeAlign(original_return_llvm_type);
                    
                    llvm::AllocaInst* const alloca_instruction = create_alloca_instruction(llvm_builder, llvm_data_layout, original_return_llvm_type);

                    transformed_arguments.values.push_back(alloca_instruction);
                    transformed_arguments.attributes.push_back(std::pmr::vector<llvm::Attribute>{{ llvm::Attribute::get(llvm_context, llvm::Attribute::NoUndef) }});
                    transformed_arguments.is_return_value_passed_as_first_argument = true;
                    break;
                }
                default: {
                    throw std::runtime_error{ "Clang_code_generation.transform_arguments(): return kind not implemented!" };
                }
            }
        }

        llvm::ArrayRef<clang::CodeGen::CGFunctionInfoArgInfo> const argument_infos = function_info.arguments();

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

                            transformed_arguments.values.push_back(loaded_element);
                            transformed_arguments.attributes.push_back({});
                        }
                    }
                    else
                    {
                        llvm::Value* const original_argument = original_arguments[argument_index];
                        h::Type_reference const& original_argument_type = function_type.input_parameter_types[argument_index];
                        llvm::Type* const original_argument_llvm_type = type_reference_to_llvm_type(llvm_context, llvm_data_layout, core_module, original_argument_type, type_database);

                        llvm::Value* transformed_argument = read_from_type(
                            llvm_context,
                            llvm_builder,
                            llvm_data_layout,
                            original_argument,
                            original_argument_llvm_type,
                            new_type,
                            Convertion_type::From_original_to_abi
                        );

                        transformed_arguments.values.push_back(transformed_argument);
                        transformed_arguments.attributes.push_back({});
                    }

                    break;
                }
                case clang::CodeGen::ABIArgInfo::Extend: {
                    throw std::runtime_error{ "Clang_code_generation.transform_arguments(): Extend not implemented!" };
                }
                case clang::CodeGen::ABIArgInfo::Indirect: {

                    h::Type_reference const& original_argument_type = function_type.input_parameter_types[argument_index];
                    llvm::Type* const original_argument_llvm_type = type_reference_to_llvm_type(llvm_context, llvm_data_layout, core_module, original_argument_type, type_database);
                    std::uint64_t const original_argument_size_in_bits = llvm_data_layout.getTypeAllocSize(original_argument_llvm_type);
                    llvm::Align const original_argument_alignment = llvm_data_layout.getABITypeAlign(original_argument_llvm_type);
                    
                    llvm::AllocaInst* const alloca_instruction = create_alloca_instruction(llvm_builder, llvm_data_layout, original_argument_llvm_type);

                    create_memcpy_call(
                        llvm_context,
                        llvm_builder,
                        llvm_module,
                        alloca_instruction,
                        original_arguments[argument_index],
                        original_argument_size_in_bits,
                        original_argument_alignment
                    );

                    transformed_arguments.values.push_back(alloca_instruction);
                    transformed_arguments.attributes.push_back(std::pmr::vector<llvm::Attribute>{{ llvm::Attribute::get(llvm_context, llvm::Attribute::NoUndef) }});
                    break;
                }
                case clang::CodeGen::ABIArgInfo::IndirectAliased: {
                    throw std::runtime_error{ "Clang_code_generation.transform_arguments(): IndirectAliased not implemented!" };
                }
                case clang::CodeGen::ABIArgInfo::Ignore: {
                    break;
                }
                case clang::CodeGen::ABIArgInfo::Expand: {
                    throw std::runtime_error{ "Clang_code_generation.transform_arguments(): Expand not implemented!" };
                }
                case clang::CodeGen::ABIArgInfo::CoerceAndExpand: {
                    throw std::runtime_error{ "Clang_code_generation.transform_arguments(): CoerceAndExpand not implemented!" };
                }
                case clang::CodeGen::ABIArgInfo::InAlloca: {
                    throw std::runtime_error{ "Clang_code_generation.transform_arguments(): InAlloca not implemented!" };
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
        llvm::Module& llvm_module,
        Clang_module_data& clang_module_data,
        h::Module const& core_module,
        h::Function_type const& function_type,
        llvm::Function& llvm_function,
        std::span<llvm::Value* const> const arguments,
        Declaration_database const& declaration_database,
        Type_database const& type_database
    )
    {
        clang::CodeGen::CGFunctionInfo const& function_info = create_clang_function_info(clang_module_data, function_type, declaration_database);

        Transformed_arguments const transformed_arguments = transform_arguments(llvm_context, llvm_builder, llvm_data_layout, llvm_module, core_module, function_type, function_info, arguments, type_database);

        llvm::CallInst* call_instruction = llvm_builder.CreateCall(&llvm_function, transformed_arguments.values);

        for (std::size_t argument_index = 0; argument_index <transformed_arguments.attributes.size(); ++argument_index)
        {
            std::span<llvm::Attribute const> const attributes = transformed_arguments.attributes[argument_index];

            for (llvm::Attribute const& attribute : attributes)
            {
                call_instruction->addParamAttr(static_cast<unsigned>(argument_index), attribute);
            }
        }

        if (transformed_arguments.is_return_value_passed_as_first_argument)
        {
            return transformed_arguments.values[0];
        }

        return read_function_return_instruction(
            llvm_context,
            llvm_builder,
            llvm_data_layout,
            core_module,
            function_type,
            function_info,
            type_database,
            call_instruction
        );
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

        Source_position const parameter_source_position =
            function_declaration.input_parameter_source_positions.has_value() ?
            function_declaration.input_parameter_source_positions.value()[input_parameter_index] :
            Source_position{ .line = function_declaration_source_location.line, .column = function_declaration_source_location.column };

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
            parameter_source_position.line,
            llvm_argument_debug_type,
            true
        );

        llvm::DILocation* const debug_location = llvm::DILocation::get(llvm_context, parameter_source_position.line, parameter_source_position.column, debug_scope);

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
            std::pmr::string const& restored_argument_name = function_declaration.input_parameter_names[restored_argument_index];
            h::Type_reference const& restored_argument_type = function_declaration.type.input_parameter_types[restored_argument_index];

            clang::CodeGen::ABIArgInfo::Kind const kind = argument_info.info.getKind();

            switch (kind)
            {
                case clang::CodeGen::ABIArgInfo::Direct: {

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
                    throw std::runtime_error{ "Clang_code_generation.generate_function_arguments(): Extend not implemented!" };
                }
                case clang::CodeGen::ABIArgInfo::Indirect: {

                    llvm::Type* const pointer_type = llvm::PointerType::get(llvm::Type::getInt8Ty(llvm_context), 0);
                    llvm::Align const pointer_type_alignment = llvm_data_layout.getABITypeAlign(pointer_type);

                    llvm::AllocaInst* const alloca_instruction = create_alloca_instruction(llvm_builder, llvm_data_layout, pointer_type, restored_argument_name.data());
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

                    llvm::Value* const function_argument = llvm_function.getArg(function_argument_index);
                    llvm_builder.CreateAlignedStore(function_argument, alloca_instruction, pointer_type_alignment);
                    function_argument_index += 1;

                    break;
                }
                case clang::CodeGen::ABIArgInfo::IndirectAliased: {
                    throw std::runtime_error{ "Clang_code_generation.generate_function_arguments(): IndirectAliased not implemented!" };
                }
                case clang::CodeGen::ABIArgInfo::Ignore: {
                    break;
                }
                case clang::CodeGen::ABIArgInfo::Expand: {
                    throw std::runtime_error{ "Clang_code_generation.generate_function_arguments(): Expand not implemented!" };
                }
                case clang::CodeGen::ABIArgInfo::CoerceAndExpand: {
                    throw std::runtime_error{ "Clang_code_generation.generate_function_arguments(): CoerceAndExpand not implemented!" };
                }
                case clang::CodeGen::ABIArgInfo::InAlloca: {
                    throw std::runtime_error{ "Clang_code_generation.generate_function_arguments(): InAlloca not implemented!" };
                }
            }
        }

        return restored_arguments;
    }

    llvm::Value* generate_function_return_instruction(
        llvm::LLVMContext& llvm_context,
        llvm::IRBuilder<>& llvm_builder,
        llvm::DataLayout const& llvm_data_layout,
        llvm::Module& llvm_module,
        Clang_module_data& clang_module_data,
        h::Module const& core_module,
        h::Function_type const& function_type,
        llvm::Function& llvm_function,
        Declaration_database const& declaration_database,
        Type_database const& type_database,
        Value_and_type const& value_to_return
    )
    {
        clang::CodeGen::CGFunctionInfo const& function_info = create_clang_function_info(clang_module_data, function_type, declaration_database);

        if (function_type.output_parameter_types.empty())
        {
            llvm::Value* const instruction = llvm_builder.CreateRetVoid();
            return instruction;
        }

        clang::CodeGen::ABIArgInfo const& return_info = function_info.getReturnInfo();
        clang::CodeGen::ABIArgInfo::Kind const kind = return_info.getKind();

        switch (kind)
        {
            case clang::CodeGen::ABIArgInfo::Direct: {

                h::Type_reference const& original_return_type = function_type.output_parameter_types[0];
                llvm::Type* const original_return_llvm_type = type_reference_to_llvm_type(llvm_context, llvm_data_layout, core_module, original_return_type, type_database);

                llvm::Type* const new_return_llvm_type = return_info.getCoerceToType();

                llvm::Value* const converted_value = read_from_type(
                    llvm_context,
                    llvm_builder,
                    llvm_data_layout,
                    value_to_return.value,
                    original_return_llvm_type,
                    new_return_llvm_type,
                    Convertion_type::From_original_to_abi
                );
                
                llvm::Value* const instruction = llvm_builder.CreateRet(converted_value);
                return instruction;
            }
            case clang::CodeGen::ABIArgInfo::Indirect: {

                // Return value was passed as the first argument pointer
                // So here we need to store the result in that first argument pointer

                llvm::Argument* const return_argument = llvm_function.getArg(0);

                h::Type_reference const& return_type = function_type.output_parameter_types[0];
                llvm::Type* const return_llvm_type = type_reference_to_llvm_type(llvm_context, llvm_data_layout, core_module, return_type, type_database);
                std::uint64_t const return_size_in_bits = llvm_data_layout.getTypeAllocSize(return_llvm_type);
                llvm::Align const return_alignment = llvm_data_layout.getABITypeAlign(return_llvm_type);

                if (value_to_return.value->getType()->isPointerTy())
                {
                    create_memcpy_call(
                        llvm_context,
                        llvm_builder,
                        llvm_module,
                        return_argument,
                        value_to_return.value,
                        return_size_in_bits,
                        return_alignment
                    );

                    llvm::Value* const return_instruction = llvm_builder.CreateRetVoid();
                    return return_instruction;
                }
                else
                {
                    llvm_builder.CreateAlignedStore(value_to_return.value, return_argument, return_alignment);

                    llvm::Value* const return_instruction = llvm_builder.CreateRetVoid();
                    return return_instruction;
                }
            }
            case clang::CodeGen::ABIArgInfo::Ignore: {
                llvm::Value* const return_instruction = llvm_builder.CreateRetVoid();
                return return_instruction;
            }
            default: {
                throw std::runtime_error{ "Clang_code_generation.generate_function_return_value(): return kind not implemented!" };
            }
        }
    }

    llvm::ConstantInt* get_constant(
        llvm::LLVMContext& llvm_context,
        unsigned value
    )
    {
        return llvm::ConstantInt::get(llvm::Type::getInt32Ty(llvm_context), value);
    }

    llvm::Value* read_from_different_type(
        llvm::LLVMContext& llvm_context,
        llvm::IRBuilder<>& llvm_builder,
        llvm::DataLayout const& llvm_data_layout,
        llvm::Value* const source_llvm_value,
        llvm::Type* const source_llvm_type,
        llvm::Type* const destination_llvm_type,
        Convertion_type const convertion_type
    )
    {
        if (source_llvm_type->isStructTy() && destination_llvm_type->isStructTy())
        {
            if (convertion_type == Convertion_type::From_original_to_abi)
            {
                llvm::Value* const load_instruction = llvm_builder.CreateAlignedLoad(destination_llvm_type, source_llvm_value, llvm_data_layout.getABITypeAlign(source_llvm_type));
                return load_instruction;
            }
            else
            {
                llvm::AllocaInst* const destination = create_alloca_instruction(llvm_builder, llvm_data_layout, destination_llvm_type);
            
                llvm::StructType* const source_struct_llvm_type = static_cast<llvm::StructType*>(source_llvm_type);
                llvm::ArrayRef<llvm::Type*> const source_struct_elements = source_struct_llvm_type->elements();

                for (unsigned source_element_index = 0; source_element_index < source_struct_elements.size(); ++source_element_index)
                {
                    llvm::Value* const pointer_to_destination = llvm_builder.CreateInBoundsGEP(source_llvm_type, destination, {get_constant(llvm_context, 0), get_constant(llvm_context, source_element_index)});
                    llvm::Value* const extract_value = llvm_builder.CreateExtractValue(source_llvm_value, {source_element_index});
                    llvm_builder.CreateAlignedStore(extract_value, pointer_to_destination, llvm_data_layout.getABITypeAlign(destination_llvm_type));
                }

                return destination;
            }
        }
        else if (!source_llvm_type->isStructTy() && destination_llvm_type->isStructTy())
        {
            llvm::AllocaInst* const destination = create_alloca_instruction(llvm_builder, llvm_data_layout, destination_llvm_type);
            llvm_builder.CreateAlignedStore(source_llvm_value, destination, llvm_data_layout.getABITypeAlign(destination_llvm_type));
            return destination;
        }
        else if (source_llvm_type->isStructTy() && !destination_llvm_type->isStructTy())
        {
            llvm::Value* const pointer_to_source = llvm_builder.CreateInBoundsGEP(source_llvm_type, source_llvm_value, {get_constant(llvm_context, 0), get_constant(llvm_context, 0)});
            llvm::LoadInst* const destination_value = llvm_builder.CreateAlignedLoad(destination_llvm_type, pointer_to_source, llvm_data_layout.getABITypeAlign(source_llvm_type));
            return destination_value;
        }

        throw std::runtime_error{ "read_from_different_type not implemented yet!" };
    }

    llvm::Value* read_from_type(
        llvm::LLVMContext& llvm_context,
        llvm::IRBuilder<>& llvm_builder,
        llvm::DataLayout const& llvm_data_layout,
        llvm::Value* const source_llvm_value,
        llvm::Type* const source_llvm_type,
        llvm::Type* const destination_llvm_type,
        Convertion_type const convertion_type
    )
    {   
        if (source_llvm_type == destination_llvm_type)
        {
            if (source_llvm_value->getType() != source_llvm_type && source_llvm_value->getType()->isPointerTy())
            {
                llvm::Value* const loaded_value = create_load_instruction(llvm_builder, llvm_data_layout, destination_llvm_type, source_llvm_value);
                return loaded_value;
            }
            else
            {
                return source_llvm_value;
            }
        }

        return read_from_different_type(
            llvm_context,
            llvm_builder,
            llvm_data_layout,
            source_llvm_value,
            source_llvm_type,
            destination_llvm_type,
            convertion_type
        );
    }

    llvm::Value* read_function_return_instruction(
        llvm::LLVMContext& llvm_context,
        llvm::IRBuilder<>& llvm_builder,
        llvm::DataLayout const& llvm_data_layout,
        h::Module const& core_module,
        h::Function_type const& function_type,
        clang::CodeGen::CGFunctionInfo const& function_info,
        Type_database const& type_database,
        llvm::Value* const call_instruction
    )
    {
        if (function_type.output_parameter_types.empty())
        {
            return call_instruction;
        }

        clang::CodeGen::ABIArgInfo const& return_info = function_info.getReturnInfo();
        clang::CodeGen::ABIArgInfo::Kind const kind = return_info.getKind();

        switch (kind)
        {
            case clang::CodeGen::ABIArgInfo::Direct: {

                h::Type_reference const& original_return_type = function_type.output_parameter_types[0];
                llvm::Type* const original_return_llvm_type = type_reference_to_llvm_type(llvm_context, llvm_data_layout, core_module, original_return_type, type_database);

                llvm::Type* const new_return_llvm_type = return_info.getCoerceToType();

                return read_from_type(
                    llvm_context,
                    llvm_builder,
                    llvm_data_layout,
                    call_instruction,
                    new_return_llvm_type,
                    original_return_llvm_type,
                    Convertion_type::From_abi_to_original
                );
            }
            case clang::CodeGen::ABIArgInfo::Ignore: {
                return call_instruction;
            }
            default: {
                throw std::runtime_error{ "Clang_code_generation.read_function_return_instruction(): return kind not implemented!" };
            }
        }
    }

    llvm::Type* convert_type(
        Clang_module_data const& clang_module_data,
        std::string_view const module_name,
        std::string_view const declaration_name
    )
    {
        Clang_module_declarations const& clang_declarations = clang_module_data.declaration_database.map.at(module_name.data());
        clang::RecordDecl* const record_declaration = clang_declarations.struct_declarations.at(declaration_name.data());
        clang::QualType const qual_type = clang_module_data.ast_context.getRecordType(record_declaration);
        llvm::Type* const clang_type = clang::CodeGen::convertTypeForMemory(clang_module_data.code_generator->CGM(), qual_type);
        return clang_type;
    }

    std::optional<clang::QualType> create_type(
        clang::ASTContext& clang_ast_context,
        h::Type_reference const& type_reference,
        Declaration_database const& declaration_database,
        Clang_declaration_database const& clang_declaration_database
    )
    {
        if (std::holds_alternative<h::Builtin_type_reference>(type_reference.data))
        {
            h::Builtin_type_reference const& builtin_type = std::get<h::Builtin_type_reference>(type_reference.data);
            if (builtin_type.value == "__builtin_va_list")
                return clang_ast_context.getBuiltinVaListType();
        }
        else if (std::holds_alternative<h::Fundamental_type>(type_reference.data))
        {
            h::Fundamental_type const fundamental_type = std::get<h::Fundamental_type>(type_reference.data);
            switch (fundamental_type)
            {
                case h::Fundamental_type::Bool: {
                    return clang_ast_context.getIntTypeForBitwidth(8, 0);
                }
                case h::Fundamental_type::Byte: {
                    return clang_ast_context.getIntTypeForBitwidth(8, 0);
                }
                case h::Fundamental_type::Float16: {
                    return clang_ast_context.getRealTypeForBitwidth(16, clang::FloatModeKind::Half);
                }
                case h::Fundamental_type::Float32: {
                    return clang_ast_context.getRealTypeForBitwidth(32, clang::FloatModeKind::Float);
                }
                case h::Fundamental_type::Float64: {
                    return clang_ast_context.getRealTypeForBitwidth(64, clang::FloatModeKind::Double);
                }
                case h::Fundamental_type::String: {
                    Clang_module_declarations const& clang_declarations = clang_declaration_database.map.at(c_builtin_module_name.data());
                    clang::RecordDecl* const record_declaration = clang_declarations.struct_declarations.at("String");

                    return clang_ast_context.getRecordType(record_declaration);
                }
                case h::Fundamental_type::Any_type: {
                    return clang_ast_context.VoidPtrTy;
                }
                case h::Fundamental_type::C_bool: {
                    return clang_ast_context.BoolTy;
                }
                case h::Fundamental_type::C_char: {
                    return clang_ast_context.CharTy;
                }
                case h::Fundamental_type::C_schar: {
                    return clang_ast_context.SignedCharTy;
                }
                case h::Fundamental_type::C_uchar: {
                    return clang_ast_context.UnsignedCharTy;
                }
                case h::Fundamental_type::C_short: {
                    return clang_ast_context.ShortTy;
                }
                case h::Fundamental_type::C_ushort: {
                    return clang_ast_context.UnsignedShortTy;
                }
                case h::Fundamental_type::C_int: {
                    return clang_ast_context.IntTy;
                }
                case h::Fundamental_type::C_uint: {
                    return clang_ast_context.UnsignedIntTy;
                }
                case h::Fundamental_type::C_long: {
                    return clang_ast_context.LongTy;
                }
                case h::Fundamental_type::C_ulong: {
                    return clang_ast_context.UnsignedLongTy;
                }
                case h::Fundamental_type::C_longlong: {
                    return clang_ast_context.LongLongTy;
                }
                case h::Fundamental_type::C_ulonglong: {
                    return clang_ast_context.UnsignedLongLongTy;
                }
                case h::Fundamental_type::C_longdouble: {
                    return clang_ast_context.LongDoubleTy;
                }
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
                if (std::holds_alternative<h::Alias_type_declaration const*>(declaration->data))
                {
                    Clang_module_declarations const& clang_declarations = clang_declaration_database.map.at(custom_type_reference.module_reference.name.data());
                    clang::TypedefDecl* const typedef_declaration = clang_declarations.alias_type_declarations.at(custom_type_reference.name);

                    return clang_ast_context.getTypedefType(typedef_declaration);
                }
                else if (std::holds_alternative<h::Enum_declaration const*>(declaration->data))
                {
                    Clang_module_declarations const& clang_declarations = clang_declaration_database.map.at(custom_type_reference.module_reference.name.data());
                    clang::EnumDecl* const enum_declaration = clang_declarations.enum_declarations.at(custom_type_reference.name);

                    return clang_ast_context.getEnumType(enum_declaration);
                }
                else if (std::holds_alternative<h::Struct_declaration const*>(declaration->data))
                {
                    Clang_module_declarations const& clang_declarations = clang_declaration_database.map.at(custom_type_reference.module_reference.name.data());
                    clang::RecordDecl* const record_declaration = clang_declarations.struct_declarations.at(custom_type_reference.name);

                    return clang_ast_context.getRecordType(record_declaration);
                }
                else if (std::holds_alternative<h::Union_declaration const*>(declaration->data))
                {
                    Clang_module_declarations const& clang_declarations = clang_declaration_database.map.at(custom_type_reference.module_reference.name.data());
                    clang::RecordDecl* const record_declaration = clang_declarations.union_declarations.at(custom_type_reference.name);

                    return clang_ast_context.getRecordType(record_declaration);
                }
            }
        }
        else if (std::holds_alternative<h::Pointer_type>(type_reference.data))
        {
            h::Pointer_type const pointer_type = std::get<h::Pointer_type>(type_reference.data);
            if (pointer_type.element_type.empty())
                return clang_ast_context.getPointerType(clang_ast_context.VoidTy);

            std::optional<clang::QualType> const element_type = create_type(
                clang_ast_context,
                pointer_type.element_type[0],
                declaration_database,
                clang_declaration_database
            );
            if (element_type.has_value())
                return clang_ast_context.getPointerType(*element_type);
            else
                return clang_ast_context.getPointerType(clang_ast_context.VoidTy);
        }

        return std::nullopt;
    }

    std::optional<clang::QualType> create_type(
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
