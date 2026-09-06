import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import dayjs from 'dayjs';

export const FormDatePicker = ({
    label,
    value,
    onChange,
    error,
    required,
    name,
    placeholder = "DD/MM/YYYY",
    showTodayAsDefault = false,
    disabled = false,
    className = ""
}) => {
    const [open, setOpen] = useState(false);
    const [viewDate, setViewDate] = useState(value ? dayjs(value) : dayjs());
    const [popoverStyle, setPopoverStyle] = useState({});
    const triggerRef = useRef(null);
    const popoverRef = useRef(null);

    const today = dayjs();
    const parsed = value ? dayjs(value) : (showTodayAsDefault ? today : null);

    // Position the popover relative to the trigger button
    const updatePosition = () => {
        if (!triggerRef.current) return;
        const rect = triggerRef.current.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        const popoverHeight = 320; // approximate

        const top = spaceBelow >= popoverHeight
            ? rect.bottom + window.scrollY + 8
            : rect.top + window.scrollY - popoverHeight - 8;

        setPopoverStyle({
            position: 'absolute',
            top,
            left: rect.left + window.scrollX,
            width: Math.max(rect.width, 280),
            zIndex: 99999,
        });
    };

    // Open/close
    const handleToggle = () => {
        if (disabled) return;
        if (!open) updatePosition();
        setOpen(o => !o);
    };

    // Close on outside click
    useEffect(() => {
        if (!open) return;
        const handler = (e) => {
            if (
                triggerRef.current && !triggerRef.current.contains(e.target) &&
                popoverRef.current && !popoverRef.current.contains(e.target)
            ) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open]);

    // Reposition on scroll/resize
    useEffect(() => {
        if (!open) return;
        const handler = () => updatePosition();
        window.addEventListener('scroll', handler, true);
        window.addEventListener('resize', handler);
        return () => {
            window.removeEventListener('scroll', handler, true);
            window.removeEventListener('resize', handler);
        };
    }, [open]);

    // Sync view when value changes
    useEffect(() => {
        if (value) setViewDate(dayjs(value));
    }, [value]);

    const handleDayClick = (day) => {
        const selected = viewDate.date(day);
        onChange({ target: { name, value: selected.format('YYYY-MM-DD') } });
        setOpen(false);
    };

    const prevMonth = () => setViewDate(v => v.subtract(1, 'month'));
    const nextMonth = () => setViewDate(v => v.add(1, 'month'));

    const daysInMonth = viewDate.daysInMonth();
    const firstDayOfWeek = viewDate.startOf('month').day();


    const stateStyles = error
        ? "border-red-400 ring-2 ring-red-500/15"
        : open
            ? "border-[#B12B89] ring-2 ring-[#B12B89]/15"
            : "border-slate-300 dark:border-[#2e2e2e] hover:border-slate-400 dark:hover:border-[#3a3a3a]";

    const popover = open && createPortal(
        <div
            ref={popoverRef}
            style={popoverStyle}
            className="
                bg-white dark:bg-[#222222]
                border border-slate-200 dark:border-[#2e2e2e]
                rounded-xl shadow-xl shadow-black/10
                p-3 min-w-[280px]
            "
        >
            {/* Month navigation */}
            <div className="flex items-center justify-between mb-3">
                <button
                    type="button"
                    onClick={prevMonth}
                    className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-[#2e2e2e] text-slate-500 dark:text-slate-400 transition-colors"
                >
                    <ChevronLeft size={16} />
                </button>
                <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
                    {viewDate.format('MMMM YYYY')}
                </span>
                <button
                    type="button"
                    onClick={nextMonth}
                    className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-[#2e2e2e] text-slate-500 dark:text-slate-400 transition-colors"
                >
                    <ChevronRight size={16} />
                </button>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 mb-1">
                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
                    <div key={d} className="text-center text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 py-1">
                        {d}
                    </div>
                ))}
            </div>

            {/* Days grid */}
            <div className="grid grid-cols-7 gap-y-0.5">
                {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                    <div key={`empty-${i}`} />
                ))}
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                    const thisDay = viewDate.date(day);
                    const isSelected = parsed && thisDay.isSame(parsed, 'day');
                    const isToday = thisDay.isSame(today, 'day');

                    return (
                        <button
                            key={day}
                            type="button"
                            onClick={() => handleDayClick(day)}
                            className={`
                                h-8 w-full rounded-lg text-sm font-medium transition-all duration-100
                                ${isSelected
                                    ? 'bg-[#B12B89] text-white shadow-sm'
                                    : isToday
                                        ? 'bg-blue-50 dark:bg-blue-900/30 text-[#B12B89] dark:text-blue-400 font-bold'
                                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#2e2e2e]'
                                }
                            `}
                        >
                            {day}
                        </button>
                    );
                })}
            </div>

            {/* Clear button */}
            {value && (
                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-[#2e2e2e]">
                    <button
                        type="button"
                        onClick={() => {
                            onChange({ target: { name, value: '' } });
                            setOpen(false);
                        }}
                        className="w-full text-xs font-bold text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 transition-colors py-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                        Clear date
                    </button>
                </div>
            )}
        </div>,
        document.body
    );

    return (
        <div className={`w-full group ${className}`}>
            {label && (
                <label className="block text-[13px] font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    {label} {required && <span className="text-red-500">*</span>}
                </label>
            )}

            {/* Trigger */}
            <div
                ref={triggerRef}
                onClick={handleToggle}
                className={`
                    w-full px-3 text-sm rounded-md border transition-colors duration-150 outline-none
                    h-10 leading-none
                    bg-white dark:bg-[#222222]/60
                    flex items-center justify-between gap-2 cursor-pointer select-none
                    ${disabled ? 'opacity-60 cursor-not-allowed' : ''}
                    ${stateStyles}
                `}
            >
                <span className={parsed ? "text-slate-900 dark:text-slate-100" : "text-slate-400 dark:text-slate-500"}>
                    {parsed ? parsed.format('DD/MM/YYYY') : placeholder}
                </span>
                <Calendar size={16} className="text-slate-400 dark:text-slate-500 flex-shrink-0" />
            </div>

            {/* Portal-rendered popover */}
            {popover}

            {error && (
                <p className="text-xs font-medium text-red-600 dark:text-red-400 mt-1.5">
                    {error}
                </p>
            )}
        </div>
    );
};