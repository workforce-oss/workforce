export const LoginPageComponent = (props: { baseUrl: string, state: string }) => {

    return (

            <form className="max-w-sm mx-auto p-5" action={props.baseUrl + "/login"} method="post">
                <div className="mb-5">
                    <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                        Username
                    </label>
                    <input type="text" name="username" id="username" autoComplete="username" required
                        className="mt-1 p-2 block shadow-sm sm:text-sm border border-gray-300 rounded-md"
                    />
                </div>
                <div className="mb-5">
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                        Password
                    </label>
                    <input type="password" name="password" id="password" autoComplete="current-password" required
                        className="mt-1 p-2 block shadow-sm sm:text-sm border border-gray-300 rounded-md"
                    />
                </div>
                <input type="hidden" name="state" value={props.state} />
                <button type="submit"
                    className="p-2 bg-blue-500 rounded-md shadow-sm hover:bg-blue-600"
                >Login</button>
            </form>
    )
}