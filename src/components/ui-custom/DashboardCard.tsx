
import React from 'react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface DashboardCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  description?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
}

const DashboardCard: React.FC<DashboardCardProps> = ({
  title,
  value,
  icon,
  description,
  trend,
  className,
}) => {
  const cardVariants = {
    initial: { 
      y: 20, 
      opacity: 0 
    },
    animate: { 
      y: 0, 
      opacity: 1,
      transition: {
        type: 'spring',
        stiffness: 260,
        damping: 20
      }
    },
    hover: { 
      y: -5,
      transition: {
        type: 'spring',
        stiffness: 400,
        damping: 10
      }
    }
  };

  const iconVariants = {
    initial: { 
      scale: 0.8,
      opacity: 0.7 
    },
    animate: { 
      scale: 1,
      opacity: 1,
      transition: {
        duration: 0.3,
        delay: 0.1
      }
    },
    hover: {
      scale: 1.05,
      transition: {
        duration: 0.2,
        yoyo: Infinity,
        repeatDelay: 0.5
      }
    }
  };

  return (
    <motion.div
      className={cn(
        "data-card",
        className
      )}
      variants={cardVariants}
      initial="initial"
      animate="animate"
      whileHover="hover"
    >
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
          <p className="text-2xl font-semibold mt-1">{value}</p>
          
          {description && (
            <p className="text-sm text-muted-foreground mt-1">{description}</p>
          )}
          
          {trend && (
            <div className="flex items-center mt-2">
              <span
                className={cn(
                  "text-xs font-medium flex items-center",
                  trend.isPositive ? "text-green-500" : "text-red-500"
                )}
              >
                {trend.isPositive ? "↑" : "↓"} {Math.abs(trend.value)}%
              </span>
              <span className="text-xs text-muted-foreground ml-1">vs last month</span>
            </div>
          )}
        </div>
        
        <motion.div
          className="w-12 h-12 rounded-full flex items-center justify-center bg-primary/10 text-primary"
          variants={iconVariants}
        >
          {icon}
        </motion.div>
      </div>
    </motion.div>
  );
};

export default DashboardCard;
