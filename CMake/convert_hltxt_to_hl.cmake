macro(convert_hltxt_to_hl)

    set(options)
    set(oneValueArgs TARGET OUTPUT_DIRECTORY)
    set(multiValueArgs TEXT_FILES)
    cmake_parse_arguments(ARGUMENT "${options}" "${oneValueArgs}" "${multiValueArgs}" ${ARGN} )

    set(WORKING_DIRECTORY "${CMAKE_CURRENT_BINARY_DIR}/working_directory")
    file(MAKE_DIRECTORY "${WORKING_DIRECTORY}")

    foreach(text_file IN LISTS ARGUMENT_TEXT_FILES)
        cmake_path(GET text_file STEM text_file_without_extension)
        set(output_path "${ARGUMENT_OUTPUT_DIRECTORY}/${text_file_without_extension}.hl")

        list(APPEND dependencies "${output_path}")

        add_custom_command(
            OUTPUT "${output_path}"
            COMMAND "node" "${parser_javascript_location}" "write" "${output_path}" "--input" "${text_file}"
            WORKING_DIRECTORY "${CMAKE_CURRENT_BINARY_DIR}/working_directory"
            VERBATIM
            COMMENT "Generating ${output_path}"
            DEPENDS Parser "${text_file}" "${parser_javascript_location}"
        )
    endforeach()

    add_custom_target(
        ${ARGUMENT_TARGET}
            DEPENDS ${WORKING_DIRECTORY} ${dependencies}
            SOURCES ${dependencies} ${TEXT_FILES}
    )

endmacro()
