import { Fragment } from "react"
import { Listbox, Transition } from "@headlessui/react"

const LanguageSelector = ({ selected, setSelected, languages }) => {
  return (
    <Listbox value={selected} onChange={setSelected}>
      <div className="relative">
        <Listbox.Button className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 font-semibold text-sm transition-all">
          <img
            src={selected.image}
            alt={selected.name}
            className="w-5 h-5 rounded-full object-cover"
          />
          <span className="uppercase">{selected.code}</span>
        </Listbox.Button>

        <Transition
          as={Fragment}
          leave="transition ease-in duration-100"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <Listbox.Options className="absolute right-0 mt-2 w-32 bg-white dark:bg-gray-700 rounded-lg shadow-xl border border-gray-200 dark:border-gray-600 overflow-hidden z-50">
            {languages.map((lang, i) => (
              <Listbox.Option key={i} value={lang} as={Fragment}>
                {({ active }) => (
                  <li
                    className={`flex items-center gap-2 px-4 py-2 text-sm cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 ${
                      selected.code === lang.code
                        ? "bg-gray-50 dark:bg-gray-600"
                        : ""
                    } ${active ? "bg-gray-100 dark:bg-gray-600" : ""}`}
                  >
                    <img
                      src={lang.image}
                      alt={lang.name}
                      className="w-5 h-5 rounded-full object-cover"
                    />
                    <span>{lang.name}</span>
                  </li>
                )}
              </Listbox.Option>
            ))}
          </Listbox.Options>
        </Transition>
      </div>
    </Listbox>
  )
}

export default LanguageSelector
