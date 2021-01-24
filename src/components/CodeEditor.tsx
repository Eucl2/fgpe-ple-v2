import React, { useEffect, useRef, useState } from "react";
// import Editor from "react-simple-code-editor";
import Prism from "prismjs";
import styled from "@emotion/styled";
// import "../styles/prism.css";
import { Controlled as CodeMirror } from "react-codemirror2";

import Editor, { DiffEditor, useMonaco, loader } from "@monaco-editor/react";
import { FindChallenge_programmingLanguages } from "../generated/FindChallenge";
import { SettingsContext } from "./Exercise/SettingsContext";
import { useContext } from "react";
import { useHotkeys } from "react-hotkeys-hook";

const CodeEditor = ({
  language,
  setCode,
  code,
  evaluateSubmission,
}: {
  language: FindChallenge_programmingLanguages;
  code: any;
  setCode: (value: string) => void;
  evaluateSubmission: () => void;
}) => {
  const { editorTheme } = useContext(SettingsContext);

  // const editorRef = useRef({ addAction: (x: any) => {} });
  // const monaco = useMonaco();

  // function handleEditorDidMount(editor: any) {
  //   // here is the editor instance
  //   // you can store it in `useRef` for further usage
  //   editorRef.current = editor;
  // }

  // useEffect(() => {
  //   if (monaco && editorRef.current) {
  //     editorRef.current.addAction({
  //       // An unique identifier of the contributed action.
  //       id: "my-unique-id",
  //       // A label of the action that will be presented to the user.
  //       label: "Submit your code",
  //       // An optional array of keybindings for the action.
  //       keybindings: [
  //         monaco.KeyMod.CtrlCmd | monaco.KeyCode.US_CLOSE_SQUARE_BRACKET,
  //       ],
  //       // A precondition for this action.
  //       precondition: null,
  //       // A rule to evaluate on top of the precondition in order to dispatch the keybindings.
  //       keybindingContext: null,
  //       contextMenuGroupId: "navigation",
  //       contextMenuOrder: 1.5,
  //       // Method that will be executed when the action is triggered.
  //       // @param editor The editor instance is passed in as a convinience
  //       run: function (ed: any) {
  //         evaluateSubmission();
  //         return;
  //       },
  //     });
  //   }
  // }, [monaco, editorRef]);

  function handleEditorChange(value: any, event: any) {
    setCode(value);
    // console.log("here is the current model value:", value);
  }

  return (
    <EditorStyled>
      <Editor
        // onMount={handleEditorDidMount}
        language={language.id?.toLowerCase()}
        value={code}
        onChange={handleEditorChange}
        theme={editorTheme}
        wrapperClassName="editor-wrapper"
        className="editor"
        options={{ fixedOverflowWidgets: true }}
      />
    </EditorStyled>
  );
};

const EditorStyled = styled.div`
  /* border-radius: 5px;
  height: 100%;
  textarea:focus {
    outline: none;
  } */
  height: 100%;
  border-top: 1px solid rgba(0, 0, 0, 0.1);
`;

export default CodeEditor;
