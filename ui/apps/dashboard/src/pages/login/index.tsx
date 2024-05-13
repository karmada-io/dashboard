import {OnlyHeaderLayout} from "@/layout";

const LoginPage = () => {
    return <>
        <OnlyHeaderLayout>
            <div className="flex justify-center items-center h-full">
                <div className="border-solid border-2 h-48 w-full mx-[150px]">请输入token</div>
            </div>
        </OnlyHeaderLayout>
    </>
}

export default LoginPage