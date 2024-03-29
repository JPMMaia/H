macro(Convert_hltxt_to_hl)

    set(options)
    set(oneValueArgs TARGET)
    set(multiValueArgs TEXT_FILES)
    cmake_parse_arguments(ARGUMENT "${options}" "${oneValueArgs}" "${multiValueArgs}" ${ARGN} )

    set(OUTPUT_DIRECTORY "${CMAKE_CURRENT_LIST_DIR}/hl")

    set(WORKING_DIRECTORY "${CMAKE_CURRENT_BINARY_DIR}/working_directory")
    file(MAKE_DIRECTORY "${WORKING_DIRECTORY}")

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
            WORKING_DIRECTORY "${CMAKE_CURRENT_BINARY_DIR}/working_directory"
            VERBATIM
            COMMENT "Generating ${output_path}"
            DEPENDS Parser "${text_file}"
        )
    endforeach()

    add_custom_target(
        ${ARGUMENT_TARGET}
            DEPENDS ${WORKING_DIRECTORY} ${dependencies}
            SOURCES ${dependencies} ${TEXT_FILES}
    )

endmacro()

Convert_hltxt_to_hl(
    TARGET Generate_examples
    TEXT_FILES
        "${CMAKE_CURRENT_LIST_DIR}/txt/assignment_expressions.hltxt"
        "${CMAKE_CURRENT_LIST_DIR}/txt/binary_expressions_precedence.hltxt"
        "${CMAKE_CURRENT_LIST_DIR}/txt/binary_expressions.hltxt"
        "${CMAKE_CURRENT_LIST_DIR}/txt/block_expressions.hltxt"
        "${CMAKE_CURRENT_LIST_DIR}/txt/booleans.hltxt"
        "${CMAKE_CURRENT_LIST_DIR}/txt/break_expressions.hltxt"
        "${CMAKE_CURRENT_LIST_DIR}/txt/for_loop_expressions.hltxt"
        "${CMAKE_CURRENT_LIST_DIR}/txt/hello_world.hltxt"
        "${CMAKE_CURRENT_LIST_DIR}/txt/if_expressions.hltxt"
        "${CMAKE_CURRENT_LIST_DIR}/txt/numbers.hltxt"
        "${CMAKE_CURRENT_LIST_DIR}/txt/numeric_casts.hltxt"
        "${CMAKE_CURRENT_LIST_DIR}/txt/pointers.hltxt"
        "${CMAKE_CURRENT_LIST_DIR}/txt/switch_expressions.hltxt"
        "${CMAKE_CURRENT_LIST_DIR}/txt/ternary_condition_expressions.hltxt"
        "${CMAKE_CURRENT_LIST_DIR}/txt/unary_expressions.hltxt"
        "${CMAKE_CURRENT_LIST_DIR}/txt/variables.hltxt"
        "${CMAKE_CURRENT_LIST_DIR}/txt/while_loop_expressions.hltxt"
)
