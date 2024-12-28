add_library(H_C_header_importer)
add_library(H::C_header_importer ALIAS H_C_header_importer)

target_compile_features(H_C_header_importer PUBLIC cxx_std_23)

target_link_libraries(H_C_header_importer PUBLIC H::Common H::Core H::JSON_serializer)

## LLVM ##

find_package(Clang CONFIG REQUIRED)
target_include_directories(H_C_header_importer PRIVATE ${CLANG_INCLUDE_DIRS})
target_link_libraries(H_C_header_importer PRIVATE libclang clangTooling)

## End LLVM ##

if(WIN32)
   find_package(xxHash CONFIG REQUIRED)
   target_link_libraries(H_C_header_importer PRIVATE xxHash::xxhash)
   install(IMPORTED_RUNTIME_ARTIFACTS xxHash::xxhash)
else()
   find_package(PkgConfig REQUIRED)
   pkg_check_modules(XXHASH REQUIRED IMPORTED_TARGET libxxhash)

   target_include_directories(H_C_header_importer PRIVATE ${XXHASH_INCLUDE_DIRS})
   target_link_libraries(H_C_header_importer PRIVATE PkgConfig::XXHASH)
endif()

target_sources(H_C_header_importer PRIVATE
   "C_header_hash.cppm"
   "C_header_hash.cpp"
   "C_header_importer.cppm"
   "C_header_importer.cpp"
)

if(BUILD_TESTING)
   find_file(
      stdio_location
      "stdio.h"
      REQUIRED
   )
   message(STATUS "stdio_location is ${stdio_location}")
   get_filename_component(c_headers_location ${stdio_location} DIRECTORY)
   message(STATUS "c_headers_location is ${c_headers_location}")

   find_package(Vulkan REQUIRED)
   set(vulkan_headers_location "${Vulkan_INCLUDE_DIRS}")
   message(STATUS "vulkan_headers_location is ${vulkan_headers_location}")

   add_executable(H_C_header_importer_tests)
   target_link_libraries(H_C_header_importer_tests PRIVATE H_C_header_importer)

   find_package(Catch2 CONFIG REQUIRED)
   target_link_libraries(H_C_header_importer_tests PRIVATE Catch2::Catch2 Catch2::Catch2WithMain)

   target_compile_definitions(
      H_C_header_importer_tests
      PRIVATE
         C_HEADERS_LOCATION="${c_headers_location}"
         VULKAN_HEADERS_LOCATION="${vulkan_headers_location}"
   )

   target_sources(H_C_header_importer_tests PRIVATE "C_header_hash.tests.cpp" "C_header_importer.tests.cpp")

   include(Catch)
   catch_discover_tests(H_C_header_importer_tests)
endif()

add_executable(C_header_importer_tool)
target_link_libraries(C_header_importer_tool PRIVATE H::Core H::C_header_importer H::JSON_serializer)
target_sources(C_header_importer_tool PRIVATE "main.cpp")

macro(Import_c_header)

   set(options)
   set(oneValueArgs TARGET OUTPUT_DIRECTORY)
   set(multiValueArgs HEADERS)
   cmake_parse_arguments(ARGUMENT "${options}" "${oneValueArgs}" "${multiValueArgs}" ${ARGN} )

   foreach(header IN LISTS ARGUMENT_HEADERS)
      cmake_path(GET header STEM header_without_extension)
      set(output_path "${ARGUMENT_OUTPUT_DIRECTORY}/C_${header_without_extension}.hl")

      list(APPEND dependencies "${output_path}")

      add_custom_command(
         OUTPUT "${output_path}"
         COMMAND C_header_importer_tool
            ARGS "C.${header_without_extension}" "${header}" "${output_path}"
         DEPENDS "${header}"
         COMMENT "Generating ${output_path}"
      )
   endforeach()

   add_custom_target(
      C_standard_library ALL
         DEPENDS ${dependencies}
         SOURCES ${dependencies} ${ARGUMENT_HEADERS}
   )

endmacro()

find_file(
   stdio_location
   "stdio.h"
   REQUIRED
)
get_filename_component(c_headers_location ${stdio_location} DIRECTORY)

Import_c_header(
   TARGET C_standard_library
   OUTPUT_DIRECTORY "${CMAKE_BINARY_DIR}/C_standard_library"
   HEADERS
      "${c_headers_location}/stdio.h"
)
