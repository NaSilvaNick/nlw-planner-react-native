import clsx from "clsx";
import { ReactNode } from "react";
import { TextInput, TextInputProps, View, ViewProps} from "react-native";
import { colors } from "@/styles/colors";

type Variants = 'primary' | 'secondary' | 'tertiary'

type InputProps = ViewProps & {
  children: ReactNode,
  variant?: Variants,
}

function Input( { className, children, variant = 'primary', ...rest } : InputProps) {
  return (
    <View
      {...rest}
      className={clsx('min-h-16 max-h-16 flex-row items-center gap-2', className, {
        'h-14 px-4 rounded-lg border border-zinc-800': variant !== 'primary',
        'bg-zinc-950': variant === 'secondary',
        'bg-zinc-900': variant === 'tertiary'
      })}
    >
      {children}
    </View>
  )
}

function Field(props : TextInputProps) {
  return (
    <TextInput
      {...props}
      placeholderTextColor={colors.zinc[400]}
      cursorColor={colors.zinc[100]}
      className="flex-1 text-zinc-100 text-lg font-regular"
    />
  )
}

Input.Field = Field

export { Input }