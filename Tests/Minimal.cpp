
#include <cstddef>
#include <memory_resource>
#include <string>
#include <string_view>
#include <vector>

#include <llvm/IR/LLVMContext.h>
#include <llvm/IR/Module.h>

import h.compiler;
import h.core;

using namespace h;

template <typename T>
std::pmr::vector<std::byte> to_bytes(T const value)
{
    std::pmr::vector<std::byte> bytes;
    bytes.resize(sizeof(T));

    std::memcpy(bytes.data(), &value, sizeof(T));

    return bytes;
}

std::pmr::vector<std::byte> to_bytes(std::string_view const string)
{
    std::pmr::vector<std::byte> bytes;
    bytes.resize(string.size());

    std::memcpy(bytes.data(), string.data(), bytes.size());

    return bytes;
}

int main()
{
    std::pmr::vector<Expression> const expressions
    {
        {
            Expression
            {
                .data = Binary_expression
                {
                    .left_hand_side = {.type = Variable_expression::Type::Function_argument, .id = 0 },
                    .right_hand_side = {.type = Variable_expression::Type::Function_argument, .id = 1 },
                    .operation = Binary_expression::Operation::Add,
                }
            },
            Expression
            {
                .data = Return_expression
                {
                    .variable = {.type = Variable_expression::Type::Temporary, .id = 0 },
                }
            },
        }
    };

    std::pmr::vector<Type> const parameter_types
    {
        {
            Type
            {
                .data = Integer_type
                {
                    .precision = 64
                }
            },
            Type
            {
                .data = Integer_type
                {
                    .precision = 64
                }
            }
        }
    };

    std::pmr::vector<std::uint64_t> const argument_ids
    {
        {
            0, 1
        }
    };

    std::pmr::vector<std::pmr::string> const argument_names
    {
        {
            std::pmr::string{"lhs"}, std::pmr::string{"rhs"}
        }
    };

    Function_type const function_type
    {
        .return_type = Type
        {
            .data = Integer_type
            {
                .precision = 64
            }
        },
        .parameter_types = parameter_types
    };

    Function const function
    {
        .type = function_type,
        .name = "add",
        .argument_ids = argument_ids,
        .argument_names = argument_names,
        .linkage = Linkage::External,
        .statements =
        {
            Statement
            {
                .id = 0,
                .name = "sum",
                .expressions = expressions
            }
        }
    };

    llvm::LLVMContext llvm_context;
    llvm::Module llvm_module{ "Module", llvm_context };

    llvm::Function& llvm_function = compiler::create_function(llvm_context, llvm_module, function, {}, {});

    std::error_code error_code;
    llvm::raw_fd_ostream file_stream{ "-", error_code };
    llvm_module.print(file_stream, nullptr);

    return 0;
}