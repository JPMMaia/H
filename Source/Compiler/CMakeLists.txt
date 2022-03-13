add_library(H_compiler)
add_library(H::Compiler ALIAS H_compiler)

target_compile_features(H_compiler PRIVATE cxx_std_23)

target_link_libraries(H_compiler PRIVATE H::Core)

## LLVM ##

find_package(LLVM CONFIG REQUIRED)

list(APPEND CMAKE_MODULE_PATH "${LLVM_CMAKE_DIR}")
include(HandleLLVMOptions)
add_definitions(${LLVM_DEFINITIONS})
target_compile_definitions(H_compiler PUBLIC ${LLVM_DEFINITIONS} LLVM_DISABLE_ABI_BREAKING_CHECKS_ENFORCING)

target_include_directories(H_compiler PUBLIC ${LLVM_INCLUDE_DIRS})

llvm_map_components_to_libnames(llvm_libs Core)

target_link_libraries(H_compiler PUBLIC ${llvm_libs})

## End LLVM ##

target_sources(H_compiler PRIVATE
   "Compiler.cppm"
   "Compiler.cpp"
)