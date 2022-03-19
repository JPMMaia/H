module;

#include <llvm/IR/LLVMContext.h>
#include <llvm/IR/Module.h>
#include <llvm/IR/IRBuilder.h>
#include <llvm/IR/Verifier.h>
#include <llvm/Support/TargetSelect.h>
#include <llvm/Support/raw_ostream.h>

#include <format>
#include <iostream>
#include <memory_resource>
#include <span>
#include <variant>
#include <vector>

module h.compiler;

import h.core;

namespace h::compiler
{
    llvm::Type* to_type(
        llvm::LLVMContext& context,
        Type const& type
    )
    {
        llvm::Type* llvm_type = nullptr;

        auto const create_type = [&](auto&& data) -> void
        {
            using Subtype = std::decay_t<decltype(data)>;

            llvm_type = [&]() -> llvm::Type*
            {
                if constexpr (std::is_same_v<Subtype, Float_type>)
                {
                    switch (data.precision)
                    {
                    case 16: return llvm::Type::getHalfTy(context);
                    case 32: return llvm::Type::getFloatTy(context);
                    case 64: return llvm::Type::getDoubleTy(context);
                    default:
                        throw std::runtime_error{ "Not implemented." };
                    }
                }
                else if constexpr (std::is_same_v<Subtype, Integer_type>)
                {
                    return llvm::Type::getIntNTy(context, data.precision);
                }
                else
                {
                    static_assert(always_false_v<Subtype>, "Not implemented.");
                }
            }();
        };

        std::visit(create_type, type.data);

        return llvm_type;
    }

    std::pmr::vector<llvm::Type*> to_types(
        llvm::LLVMContext& context,
        std::span<Type const> const types,
        std::pmr::polymorphic_allocator<> const& output_allocator
    )
    {
        std::pmr::vector<llvm::Type*> output{ output_allocator };
        output.resize(types.size());

        std::transform(
            types.begin(),
            types.end(),
            output.begin(),
            [&](Type const& type) -> llvm::Type* { return to_type(context, type); }
        );

        return output;
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
        llvm::LLVMContext& context,
        Function_type const& function_type,
        std::pmr::polymorphic_allocator<> const& temporaries_allocator
    )
    {
        llvm::Type* const return_type = to_type(context, function_type.return_type);
        std::pmr::vector<llvm::Type*> const parameter_types = to_types(context, function_type.parameter_types, temporaries_allocator);

        return llvm::FunctionType::get(return_type, parameter_types, false);
    }

    llvm::Function* to_function(
        llvm::Module& module,
        llvm::FunctionType& function_type,
        Function const& function
    )
    {
        llvm::GlobalValue::LinkageTypes const linkage = to_linkage(function.linkage);

        llvm::Function* const llvm_function = llvm::Function::Create(
            &function_type,
            linkage,
            function.name.c_str(),
            module
        );

        if (!llvm_function)
        {
            throw std::runtime_error{ "Could not create function." };
        }

        if (llvm_function->arg_size() != function.argument_names.size())
        {
            throw std::runtime_error{ "Function arguments size and provided argument names size do not match." };
        }

        for (unsigned argument_index = 0; argument_index < llvm_function->arg_size(); ++argument_index)
        {
            llvm::Argument* const argument = llvm_function->getArg(argument_index);
            std::pmr::string const& name = function.argument_names[argument_index];
            argument->setName(name.c_str());
        }

        llvm_function->setCallingConv(llvm::CallingConv::C);

        return llvm_function;
    }

    llvm::Value* create_value(
        Variable_expression const& expression,
        std::unordered_map<std::uint64_t, std::size_t> const& function_argument_id_to_index,
        std::unordered_map<std::uint64_t, std::size_t> const& local_variable_id_to_index,
        std::span<llvm::Value* const> const function_arguments,
        std::span<llvm::Value* const> const local_variables,
        std::span<llvm::Value* const> const temporaries
    )
    {
        switch (expression.type)
        {
        case Variable_expression::Type::Function_argument:
        {
            std::size_t const index = function_argument_id_to_index.at(expression.id);
            return function_arguments[index];
        }
        case Variable_expression::Type::Local_variable:
        {
            std::size_t const index = local_variable_id_to_index.at(expression.id);
            return local_variables[index];
        }
        case Variable_expression::Type::Temporary:
        {
            std::size_t const index = expression.id;
            return temporaries[index];
        }
        default:
            throw std::runtime_error{ "Not implemented." };
        }
    }

    llvm::Value* create_value(
        Binary_expression const& expression,
        llvm::IRBuilder<>& builder,
        std::unordered_map<std::uint64_t, std::size_t> const& function_argument_id_to_index,
        std::unordered_map<std::uint64_t, std::size_t> const& local_variable_id_to_index,
        std::span<llvm::Value* const> const function_arguments,
        std::span<llvm::Value* const> const local_variables,
        std::span<llvm::Value* const> const temporaries
    )
    {
        llvm::Value* const left_hand_side_value = create_value(
            expression.left_hand_side,
            function_argument_id_to_index,
            local_variable_id_to_index,
            function_arguments,
            local_variables,
            temporaries
        );

        llvm::Value* const right_hand_side_value = create_value(
            expression.right_hand_side,
            function_argument_id_to_index,
            local_variable_id_to_index,
            function_arguments,
            local_variables,
            temporaries
        );

        if (left_hand_side_value->getType() != right_hand_side_value->getType())
        {
            throw std::runtime_error{ "Left and right side types must match!" };
        }

        switch (expression.operation)
        {
        case Binary_expression::Operation::Add:
            return builder.CreateAdd(left_hand_side_value, right_hand_side_value, "addtmp");
        case Binary_expression::Operation::Subtract:
            return builder.CreateSub(left_hand_side_value, right_hand_side_value, "subtmp");
        case Binary_expression::Operation::Multiply:
            return builder.CreateMul(left_hand_side_value, right_hand_side_value, "multmp");
        case Binary_expression::Operation::Signed_divide:
            return builder.CreateSDiv(left_hand_side_value, right_hand_side_value, "sdivtmp");
        case Binary_expression::Operation::Unsigned_divide:
            return builder.CreateUDiv(left_hand_side_value, right_hand_side_value, "udivtmp");
        default:
            throw std::runtime_error{ "Not implemented." };
        }
    }

    llvm::Value* create_value(
        Call_expression const& expression,
        llvm::Module& module,
        llvm::IRBuilder<>& builder,
        std::unordered_map<std::uint64_t, std::size_t> const& function_argument_id_to_index,
        std::unordered_map<std::uint64_t, std::size_t> const& local_variable_id_to_index,
        std::span<llvm::Value* const> const function_arguments,
        std::span<llvm::Value* const> const local_variables,
        std::span<llvm::Value* const> const temporaries,
        std::pmr::polymorphic_allocator<> const& temporaries_allocator
    )
    {
        llvm::Function* const llvm_function = module.getFunction(expression.function_name.c_str());
        if (!llvm_function)
        {
            throw std::runtime_error{ "Unknown function referenced." };
        }

        if (expression.arguments.size() != llvm_function->arg_size())
        {
            throw std::runtime_error{ "Incorrect # arguments passed." };
        }

        std::pmr::vector<llvm::Value*> llvm_arguments{ temporaries_allocator };
        llvm_arguments.resize(expression.arguments.size());

        for (unsigned i = 0; i < expression.arguments.size(); ++i)
        {
            llvm::Value* const value = create_value(
                expression.arguments[i],
                function_argument_id_to_index,
                local_variable_id_to_index,
                function_arguments,
                local_variables,
                temporaries
            );

            llvm_arguments[i] = value;
        }

        std::string const call_name = std::format("call_{}", expression.function_name);

        return builder.CreateCall(llvm_function, llvm_arguments, call_name);
    }

    template <typename T>
    void check_if_type_and_constant_agree(
        Type const& type,
        std::uint32_t number_of_bits
    )
    {
        if (!std::holds_alternative<T>(type.data))
        {
            throw std::runtime_error{ "expression.type and expression.data type are not the same." };
        }

        T const& actual_type = std::get<T>(type.data);
        if (actual_type.precision != number_of_bits)
        {
            throw std::runtime_error{ "type.precision != constant number of bits." };
        }
    }

    llvm::Value* create_value(
        Constant_expression const& expression,
        llvm::LLVMContext& context
    )
    {
        llvm::Type* const llvm_type = to_type(context, expression.type);

        if (std::holds_alternative<Integer_constant>(expression.data))
        {
            Integer_constant const& integer_constant = std::get<Integer_constant>(expression.data);
            check_if_type_and_constant_agree<Integer_type>(expression.type, integer_constant.number_of_bits);

            llvm::APInt const value{ integer_constant.number_of_bits, integer_constant.value, integer_constant.is_signed };
            return llvm::ConstantInt::get(llvm_type, value);
        }
        else if (std::holds_alternative<Half_constant>(expression.data))
        {
            Half_constant const& half_constant = std::get<Half_constant>(expression.data);
            check_if_type_and_constant_agree<Float_type>(expression.type, 16);

            llvm::APFloat const value{ half_constant.value };
            return llvm::ConstantFP::get(llvm_type, value);
        }
        else if (std::holds_alternative<Float_constant>(expression.data))
        {
            Float_constant const& float_constant = std::get<Float_constant>(expression.data);
            check_if_type_and_constant_agree<Float_type>(expression.type, 32);

            llvm::APFloat const value{ float_constant.value };
            return llvm::ConstantFP::get(llvm_type, value);
        }
        else if (std::holds_alternative<Double_constant>(expression.data))
        {
            Double_constant const& double_constant = std::get<Double_constant>(expression.data);
            check_if_type_and_constant_agree<Float_type>(expression.type, 64);

            llvm::APFloat const value{ double_constant.value };
            return llvm::ConstantFP::get(llvm_type, value);
        }
        else
        {
            throw std::runtime_error{ "Unknown constant type." };
        }
    }

    llvm::Value* create_value(
        Return_expression const& expression,
        llvm::IRBuilder<>& builder,
        std::unordered_map<std::uint64_t, std::size_t> const& function_argument_id_to_index,
        std::unordered_map<std::uint64_t, std::size_t> const& local_variable_id_to_index,
        std::span<llvm::Value* const> const function_arguments,
        std::span<llvm::Value* const> const local_variables,
        std::span<llvm::Value* const> const temporaries
    )
    {
        llvm::Value* const value = create_value(
            expression.variable,
            function_argument_id_to_index,
            local_variable_id_to_index,
            function_arguments,
            local_variables,
            temporaries
        );

        return builder.CreateRet(value);
    }

    llvm::Value* create_value(
        Expression const& expression,
        llvm::LLVMContext& context,
        llvm::Module& module,
        llvm::IRBuilder<>& builder,
        std::unordered_map<std::uint64_t, std::size_t> const& function_argument_id_to_index,
        std::unordered_map<std::uint64_t, std::size_t> const& local_variable_id_to_index,
        std::span<llvm::Value* const> const function_arguments,
        std::span<llvm::Value* const> const local_variables,
        std::span<llvm::Value* const> const temporaries,
        std::pmr::polymorphic_allocator<> const& temporaries_allocator
    )
    {
        llvm::Value* output = nullptr;

        auto const forward_call = [&](auto&& data)
        {
            using Expression_type = std::decay_t<decltype(data)>;

            if constexpr (std::is_same_v<Expression_type, Binary_expression>)
            {
                output = create_value(data, builder, function_argument_id_to_index, local_variable_id_to_index, function_arguments, local_variables, temporaries);
            }
            else if constexpr (std::is_same_v<Expression_type, Call_expression>)
            {
                output = create_value(data, module, builder, function_argument_id_to_index, local_variable_id_to_index, function_arguments, local_variables, temporaries, temporaries_allocator);
            }
            else if constexpr (std::is_same_v<Expression_type, Constant_expression>)
            {
                output = create_value(data, context);
            }
            else if constexpr (std::is_same_v<Expression_type, Return_expression>)
            {
                output = create_value(data, builder, function_argument_id_to_index, local_variable_id_to_index, function_arguments, local_variables, temporaries);
            }
            else if constexpr (std::is_same_v<Expression_type, Variable_expression>)
            {
                output = create_value(data, function_argument_id_to_index, local_variable_id_to_index, function_arguments, local_variables, temporaries);
            }
            else
            {
                static_assert(always_false_v<Expression_type>, "non-exhaustive visitor!");
            }
        };

        std::visit(forward_call, expression.data);

        return output;
    }

    std::unordered_map<std::uint64_t, std::size_t> create_function_argument_id_to_index_map(
        std::span<std::uint64_t const> const argument_ids
    )
    {
        std::unordered_map<std::uint64_t, std::size_t> map;
        map.reserve(argument_ids.size());

        for (std::size_t index = 0; index < argument_ids.size(); ++index)
        {
            std::uint64_t const& id = argument_ids[index];

            map[id] = index;
        }

        return map;
    }

    std::unordered_map<std::uint64_t, std::size_t> create_local_variable_id_to_index_map(
        std::span<Statement const> const statements
    )
    {
        std::unordered_map<std::uint64_t, std::size_t> map;
        map.reserve(statements.size());

        for (std::size_t index = 0; index < statements.size(); ++index)
        {
            Statement const& statement = statements[index];

            map[statement.id] = index;
        }

        return map;
    }

    llvm::Function& create_function(
        llvm::LLVMContext& llvm_context,
        llvm::Module& llvm_module,
        Function const& function,
        std::pmr::polymorphic_allocator<> const& output_allocator,
        std::pmr::polymorphic_allocator<> const& temporaries_allocator
    )
    {
        llvm::FunctionType* const llvm_function_type = to_function_type(llvm_context, function.type, temporaries_allocator);
        llvm::Function* const llvm_function = to_function(llvm_module, *llvm_function_type, function);

        llvm::BasicBlock* const block = llvm::BasicBlock::Create(llvm_context, "entry", llvm_function);

        llvm::IRBuilder<> llvm_builder{ block };

        std::unordered_map<std::uint64_t, std::size_t> const function_argument_id_to_index =
            create_function_argument_id_to_index_map(function.argument_ids);

        std::unordered_map<std::uint64_t, std::size_t> const local_variable_id_to_index =
            create_local_variable_id_to_index_map(function.statements);

        {
            std::pmr::vector<llvm::Value*> function_arguments{ temporaries_allocator };
            function_arguments.reserve(llvm_function->arg_size());

            for (auto& argument : llvm_function->args())
            {
                function_arguments.push_back(&argument);
            }

            std::pmr::vector<llvm::Value*> local_variables{ temporaries_allocator };
            local_variables.reserve(function.statements.size());

            for (Statement const& statement : function.statements)
            {
                std::pmr::vector<llvm::Value*> temporaries{ temporaries_allocator };
                temporaries.reserve(statement.expressions.size());

                for (Expression const& expression : statement.expressions)
                {
                    llvm::Value* const value = create_value(
                        expression,
                        llvm_context,
                        llvm_module,
                        llvm_builder,
                        function_argument_id_to_index,
                        local_variable_id_to_index,
                        function_arguments,
                        local_variables,
                        temporaries,
                        temporaries_allocator
                    );

                    temporaries.push_back(value);
                }

                local_variables.push_back(temporaries.back());
            }
        }

        llvm::verifyFunction(*llvm_function);

        return *llvm_function;
    }
}