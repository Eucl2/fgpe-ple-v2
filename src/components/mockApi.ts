function get_exercise_data() {
    return {
        order: 1,
        title: "Basic Arithmetic",
        description: "Write a function to add two numbers.",
        initcode: "def add(a, b):\n    # print('Hello World')",
        precode: "",
        postcode: "",
        checksource: "if 'def add' not in user_code:\n    return 'You must define a function named add()'",
        testcode: "assert add(2, 3) == 5",
        hidden: false,
        locked: false,
        mode: "basic",
        modeParameters: {},
        difficulty: "Easy"
    };
}

export { get_exercise_data };