add_library(H_compiler)
add_library(H::Compiler ALIAS H_compiler)

target_compile_features(H_compiler PRIVATE cxx_std_23)

target_link_libraries(H_compiler PRIVATE H::Core H::JSON_serializer)

## LLVM ##

find_package(LLVM CONFIG REQUIRED)

list(APPEND CMAKE_MODULE_PATH "${LLVM_CMAKE_DIR}")
include(HandleLLVMOptions)
add_definitions(${LLVM_DEFINITIONS})
target_compile_definitions(H_compiler PUBLIC ${LLVM_DEFINITIONS} LLVM_DISABLE_ABI_BREAKING_CHECKS_ENFORCING)

target_include_directories(H_compiler PUBLIC ${LLVM_INCLUDE_DIRS})

llvm_map_components_to_libnames(llvm_libs Core X86 x86asmparser passes)

target_link_libraries(H_compiler PUBLIC ${llvm_libs})

## End LLVM ##

target_sources(H_compiler PRIVATE
   "Common.cppm"
   "Common.cpp"
   "Compiler.cppm"
   "Compiler.cpp"
   "Declarations.cppm"
   "Declarations.cpp"
   "Expressions.cppm"
   "Expressions.cpp"
   "Types.cppm"
   "Types.cpp"
)

if(BUILD_TESTING)
   add_executable(H_compiler_tests)
   target_link_libraries(H_compiler_tests PRIVATE H::Compiler H::JSON_serializer)

   find_package(Catch2 CONFIG REQUIRED)
   target_link_libraries(H_compiler_tests PRIVATE Catch2::Catch2 Catch2::Catch2WithMain)

   target_compile_definitions(
      H_compiler_tests
      PRIVATE
         TEST_FILES_PATH="${CMAKE_SOURCE_DIR}/Examples/hl"
         C_STANDARD_LIBRARY_PATH="${CMAKE_BINARY_DIR}/C_standard_library"
   )

   target_sources(H_compiler_tests PRIVATE "Compiler.tests.cpp")

   include(Catch)
   catch_discover_tests(H_compiler_tests)
endif()
