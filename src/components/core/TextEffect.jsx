import { motion } from "framer-motion";

export default function TextEffect({
  children,
  className = "",
  per = "word",
  delay = 0,
}) {
  const items =
    per === "char"
      ? children.split("")
      : children.split(" ");

  const container = {
    hidden: {},
    visible: {
      transition: {
        delayChildren: delay,
        staggerChildren: 0.05,
      },
    },
  };

  const item = {
    hidden: {
      opacity: 0,
      y: 20,
      filter: "blur(8px)",
    },
    visible: {
      opacity: 1,
      y: 0,
      filter: "blur(0px)",
      transition: {
        duration: 0.35,
      },
    },
  };

  return (
    <motion.div
      className={className}
      variants={container}
      initial="hidden"
      animate="visible"
    >
      {items.map((itemText, index) => (
        <motion.span
          key={index}
          variants={item}
          style={{
            display: "inline-block",
            whiteSpace: "pre",
            marginRight: per === "word" ? "0.35em" : 0,
          }}
        >
          {itemText}
        </motion.span>
      ))}
    </motion.div>
  );
}