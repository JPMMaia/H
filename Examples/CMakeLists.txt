macro(Convert_hltxt_to_hl)

    set(options)
    set(oneValueArgs TARGET)
    set(multiValueArgs TEXT_FILES)
    cmake_parse_arguments(ARGUMENT "${options}" "${oneValueArgs}" "${multiValueArgs}" ${ARGN} )

    set(OUTPUT_DIRECTORY "${CMAKE_CURRENT_LIST_DIR}/hl")

    foreach(text_file IN LISTS ARGUMENT_TEXT_FILES)
        cmake_path(GET text_file STEM text_file_without_extension)
        set(output_path "${OUTPUT_DIRECTORY}/${text_file_without_extension}.hl")

        list(APPEND dependencies "${output_path}")

        add_custom_command(
            OUTPUT "${output_path}"
            COMMAND "${CMAKE_COMMAND}"
            ARGS
                "-E" "env" "NODE_PATH=${CMAKE_BINARY_DIR}/Source/Parser/node_modules"
                "node"
                "${CMAKE_BINARY_DIR}/Source/Parser/application/Application.js"
                "write" "${output_path}"
                "--input" "${text_file}"
            VERBATIM
            COMMENT "Generating ${output_path}"
            DEPENDS Parser "${text_file}"
        )
    endforeach()

    add_custom_target(
        ${ARGUMENT_TARGET}
            DEPENDS ${dependencies}
            SOURCES ${dependencies} ${TEXT_FILES}
    )

endmacro()

Convert_hltxt_to_hl(
    TARGET Generate_examples
    TEXT_FILES
        "${CMAKE_CURRENT_LIST_DIR}/txt/booleans.hltxt"
        "${CMAKE_CURRENT_LIST_DIR}/txt/hello_world.hltxt"
        "${CMAKE_CURRENT_LIST_DIR}/txt/numbers.hltxt"
        "${CMAKE_CURRENT_LIST_DIR}/txt/numeric_casts.hltxt"
        "${CMAKE_CURRENT_LIST_DIR}/txt/variables.hltxt"
)
