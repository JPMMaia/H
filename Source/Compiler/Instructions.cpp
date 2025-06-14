module;

#include <llvm/IR/IRBuilder.h>
#include <llvm/IR/Module.h>

module h.compiler.instructions;

import h.core.types;

namespace h::compiler
{
    llvm::AllocaInst* create_alloca_instruction(
        llvm::IRBuilder<>& llvm_builder,
        llvm::DataLayout const& llvm_data_layout,
        llvm::Function& llvm_function,
        llvm::Type* const llvm_type,
        std::string_view const name,
        llvm::Value* const array_size
    )
    {
        // If the value is not sized, we cannot create alloca for it.
        if (!llvm_type->isSized())
            return nullptr;

        llvm::BasicBlock* llvm_original_insert_block = llvm_builder.GetInsertBlock();
        llvm_builder.SetInsertPointPastAllocas(&llvm_function);

        llvm::AllocaInst* const instruction = llvm_builder.CreateAlloca(llvm_type, array_size, name.data());
        
        llvm::Align const type_alignment = llvm_data_layout.getABITypeAlign(llvm_type);
        instruction->setAlignment(type_alignment);

        llvm_builder.SetInsertPoint(llvm_original_insert_block);

        return instruction;
    }

    llvm::LoadInst* create_load_instruction(
        llvm::IRBuilder<>& llvm_builder,
        llvm::DataLayout const& llvm_data_layout,
        llvm::Type* const llvm_type,
        llvm::Value* const pointer
    )
    {
        // If the value is not sized, we cannot load it.
        if (!llvm_type->isSized())
            return nullptr;

        llvm::Align const type_alignment = llvm_data_layout.getABITypeAlign(llvm_type);
        llvm::LoadInst* const instruction = llvm_builder.CreateAlignedLoad(llvm_type, pointer, type_alignment);
        return instruction;
    }

    llvm::StoreInst* create_store_instruction(
        llvm::IRBuilder<>& llvm_builder,
        llvm::DataLayout const& llvm_data_layout,
        llvm::Value* const value,
        llvm::Value* const pointer
    )
    {
        // If the value is not sized, we cannot store it.
        if (!value->getType()->isSized())
            return nullptr;

        llvm::Align const type_alignment = llvm_data_layout.getABITypeAlign(value->getType());
        llvm::StoreInst* const instruction = llvm_builder.CreateAlignedStore(value, pointer, type_alignment);
        return instruction;
    }

    llvm::Value* create_memcpy_call(
        llvm::LLVMContext& llvm_context,
        llvm::IRBuilder<>& llvm_builder,
        llvm::Module& llvm_module,
        llvm::Value* const destination_pointer,
        llvm::Value* const source_pointer,
        unsigned const size_in_bits,
        llvm::Align const alignment
    )
    {
        if (size_in_bits == 0)
            return nullptr;

        llvm::Type* const int64_type = llvm::Type::getInt64Ty(llvm_context);
        llvm::Type* const int1_type = llvm::Type::getInt1Ty(llvm_context);
        llvm::Type* const pointer_type = llvm::PointerType::get(llvm::Type::getInt8Ty(llvm_context), 0);
        llvm::Function* const memcpy_function = llvm::Intrinsic::getDeclaration(&llvm_module, llvm::Intrinsic::memcpy, {pointer_type, pointer_type, int64_type});

        llvm::Value* const size = llvm::ConstantInt::get(int64_type, size_in_bits);
        llvm::Value* const is_volatile = llvm::ConstantInt::get(int1_type, 0);

        llvm::CallInst* const call = llvm_builder.CreateCall(memcpy_function, {destination_pointer, source_pointer, size, is_volatile});    
        if (alignment != llvm::Align{})
        {
            call->addParamAttr(0, llvm::Attribute::getWithAlignment(llvm_context, alignment));
            call->addParamAttr(1, llvm::Attribute::getWithAlignment(llvm_context, alignment));
        }
        
        return call;
    }

    llvm::Value* create_memset_to_0_call(
        llvm::IRBuilder<>& llvm_builder,
        llvm::Value* const destination_pointer,
        std::uint64_t const type_alloc_size_in_bytes,
        llvm::MaybeAlign const alignment
    )
    {
        llvm::Value* const zero_value = llvm_builder.getInt8(0);
        bool const is_volatile = false;

        return llvm_builder.CreateMemSet(destination_pointer, zero_value, type_alloc_size_in_bytes, alignment, is_volatile);
    }

    llvm::Value* convert_to_boolean(
        llvm::LLVMContext& llvm_context,
        llvm::IRBuilder<>& llvm_builder,
        llvm::Value* const llvm_value,
        std::optional<h::Type_reference> const& type
    )
    {
        return (type.has_value() && is_c_bool(*type)) ?
            llvm_builder.CreateTrunc(llvm_value, llvm::Type::getInt1Ty(llvm_context)) :
            llvm_value;
    }

    llvm::Value* create_null_terminated_string_value(
        llvm::LLVMContext& llvm_context,
        llvm::Module& llvm_module,
        llvm::IRBuilder<>& llvm_builder,
        std::string_view const string
    )
    {
        llvm::Constant* const string_constant = llvm::ConstantDataArray::getString(llvm_context, string, true);

        llvm::GlobalVariable* const global_string = new llvm::GlobalVariable(
            llvm_module,
            string_constant->getType(),
            true,  
            llvm::GlobalValue::PrivateLinkage,
            string_constant,
            "function_contract_error_string"
        );

        global_string->setUnnamedAddr(llvm::GlobalValue::UnnamedAddr::Global);

        return global_string;
    }

    llvm::Value* create_log_error_instruction(
        llvm::LLVMContext& llvm_context,
        llvm::Module& llvm_module,
        llvm::IRBuilder<>& llvm_builder,
        std::string_view const message
    )
    {
        llvm::Function* puts_function = llvm_module.getFunction("puts");
        if (!puts_function)
        {
            llvm::FunctionType* const puts_function_type = llvm::FunctionType::get(
                llvm::Type::getInt32Ty(llvm_context),
                llvm::Type::getInt8Ty(llvm_context)->getPointerTo(),
                false
            );

            puts_function = llvm::Function::Create(puts_function_type, llvm::Function::ExternalLinkage, "puts", llvm_module);
        }

        llvm::Value* const message_value = create_null_terminated_string_value(
            llvm_context,
            llvm_module,
            llvm_builder,
            message
        );

        return llvm_builder.CreateCall(puts_function, {message_value});
    }

    llvm::Value* create_abort_instruction(
        llvm::LLVMContext& llvm_context,
        llvm::Module& llvm_module,
        llvm::IRBuilder<>& llvm_builder
    )
    {
        llvm::Function* abort_function = llvm_module.getFunction("abort");
        if (!abort_function)
        {
            llvm::FunctionType* const abort_function_type = llvm::FunctionType::get(llvm::Type::getVoidTy(llvm_context), false);
            abort_function = llvm::Function::Create(abort_function_type, llvm::Function::ExternalLinkage, "abort", llvm_module);
        }

        return llvm_builder.CreateCall(abort_function);
    }
}
