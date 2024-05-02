module;

#include <llvm/ExecutionEngine/Orc/Core.h>
#include <llvm/ExecutionEngine/Orc/IndirectionUtils.h>
#include <llvm/ExecutionEngine/Orc/LazyReexports.h>
#include <llvm/ExecutionEngine/Orc/Mangling.h>

#include <filesystem>
#include <memory>
#include <memory_resource>
#include <string>
#include <unordered_map>

export module h.compiler.recompile_module_layer;

import h.core;
import h.compiler;
import h.compiler.core_module_layer;

namespace h::compiler
{
    export class Recompile_module_layer
    {
    public:

        Recompile_module_layer(
            llvm::orc::ExecutionSession& execution_session,
            h::compiler::Core_module_layer& base_layer,
            llvm::orc::LazyCallThroughManager& lazy_call_through_manager,
            llvm::orc::IndirectStubsManager& indirect_stubs_manager,
            llvm::orc::MangleAndInterner& mangle
        );

        virtual llvm::Error add(
            llvm::orc::ResourceTrackerSP resource_tracker,
            Core_module_compilation_data core_module_compilation_data
        ) final;

        virtual void emit(
            std::unique_ptr<llvm::orc::MaterializationResponsibility> materialization_responsibility,
            Core_module_compilation_data core_module_compilation_data
        ) final;

    private:
        h::compiler::Core_module_layer& m_base_layer;
        llvm::orc::LazyCallThroughManager& m_lazy_call_through_manager;
        llvm::orc::IndirectStubsManager& m_indirect_stubs_manager;
        llvm::orc::MangleAndInterner& m_mangle;
    };
}
