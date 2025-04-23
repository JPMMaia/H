add_library(H_core)
add_library(H::Core ALIAS H_core)

target_compile_features(H_core PUBLIC cxx_std_23)
target_compile_definitions(H_core PUBLIC "_SCL_SECURE_NO_WARNINGS")

target_link_libraries(H_core PRIVATE H::Common)

target_sources(H_core PRIVATE 
    "Core.cppm"
    "Core.cpp"
    "Declarations.cppm"
    "Declarations.cpp"
    "Expressions.cppm"
    "Expressions.cpp"
    "Hash.cppm"
    "Hash.cpp"
    "String_hash.cppm"
    "Struct_layout.cppm"
    "Types.cppm"
    "Types.cpp"
    "Execution_engine/Execution_engine.cppm"
    "Execution_engine/Execution_engine.cpp"
)

if(WIN32)
   find_package(xxHash CONFIG REQUIRED)
   target_link_libraries(H_core PRIVATE xxHash::xxhash)
   install(IMPORTED_RUNTIME_ARTIFACTS xxHash::xxhash)
else()
   find_package(PkgConfig REQUIRED)
   pkg_check_modules(XXHASH REQUIRED IMPORTED_TARGET libxxhash)

   target_include_directories(H_core PRIVATE ${XXHASH_INCLUDE_DIRS})
   target_link_libraries(H_core PRIVATE PkgConfig::XXHASH)
endif()
