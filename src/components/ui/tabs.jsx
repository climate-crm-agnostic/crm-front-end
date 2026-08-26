import * as React from "react"
import { cn } from "@/lib/utils"

const TabsContext = React.createContext({})

const Tabs = React.forwardRef(({ className, defaultValue, value: controlledValue, onValueChange, children, ...props }, ref) => {
    const [internalValue, setInternalValue] = React.useState(defaultValue)
    const isControlled = controlledValue !== undefined
    const activeTab = isControlled ? controlledValue : internalValue

    const handleTabChange = (value) => {
        if (!isControlled) setInternalValue(value);
        if (onValueChange) onValueChange(value);
    }

    return (
        <TabsContext.Provider value={{ activeTab, onTabChange: handleTabChange }}>
            <div
                ref={ref}
                className={cn("w-full", className)}
                {...props}
            >
                {children}
            </div>
        </TabsContext.Provider>
    )
})
Tabs.displayName = "Tabs"

const TabsList = React.forwardRef(({ className, children, ...props }, ref) => {
    return (
        <div
            ref={ref}
            className={cn(
                "inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground",
                className
            )}
            {...props}
        >
            {children}
        </div>
    )
})
TabsList.displayName = "TabsList"

const TabsTrigger = React.forwardRef(({ className, value, children, ...props }, ref) => {
    const { activeTab, onTabChange } = React.useContext(TabsContext)
    const isActive = activeTab === value

    return (
        <button
            ref={ref}
            className={cn(
                "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
                isActive
                    ? "bg-background text-foreground shadow"
                    : "hover:bg-background/50 hover:text-foreground",
                className
            )}
            onClick={() => onTabChange(value)}
            type="button"
            {...props}
        >
            {children}
        </button>
    )
})
TabsTrigger.displayName = "TabsTrigger"

const TabsContent = React.forwardRef(({ className, value, children, ...props }, ref) => {
    const { activeTab } = React.useContext(TabsContext)

    if (value !== activeTab) return null;

    return (
        <div
            ref={ref}
            className={cn(
                "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                className
            )}
            {...props}
        >
            {children}
        </div>
    )
})
TabsContent.displayName = "TabsContent"

export { Tabs, TabsList, TabsTrigger, TabsContent }
