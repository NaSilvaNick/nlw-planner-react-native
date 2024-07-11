import clsx from "clsx";
import { createContext, useContext } from "react";
import { ActivityIndicator, Text, TextProps, TouchableOpacity, TouchableOpacityProps } from "react-native";

type Variants = 'primary' | 'secondary'

type ButtonProps = TouchableOpacityProps & {
  variant?: Variants,
  isLoading?: boolean,
  className?: string
}

const ThemeContext = createContext<{ variant?: Variants}>({})

function Button({ variant = 'primary', isLoading = false, children, className, ...rest } : ButtonProps) {
  return (
    <TouchableOpacity
      {...rest}
      disabled={isLoading}
      activeOpacity={0.7}
      className={clsx("h-11 flex-row items-center justify-center rounded-lg gap-2", className,{
        "bg-lime-300": variant === 'primary',
        "bg-zinc-800": variant === 'secondary'
      })}
    >
      <ThemeContext.Provider value={{variant}}>
        {isLoading ? <ActivityIndicator className="text-lime-950" /> : children}
      </ThemeContext.Provider>
    </TouchableOpacity>
  )
}

function Title(props : TextProps) {
  const { variant } = useContext(ThemeContext)
  return (
    <Text
      {...props}
      className={clsx("text-base font-semibold",{
        "text-lime-950": variant === 'primary',
        "text-zinc-200": variant === 'secondary'
      })}
    />
  )
}

Button.Title = Title

export { Button }