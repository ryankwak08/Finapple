import { FunctionComponent } from "react";
import styles from "./PlayArrowFilled.module.css";

type PlayArrowFilledProps = {
  className?: string;
};

const PlayArrowFilled: FunctionComponent<PlayArrowFilledProps> = ({
  className = "",
}) => {
  return (
    <div
      className={[styles.playArrowFilled, className].filter(Boolean).join(" ")}
      data-name="play_arrow_filled"
      data-node-id="20:46"
      aria-hidden="true"
    >
      <div className={styles.icon} data-name="icon" data-node-id="I20:46;56576:16105">
        <svg
          className={styles.iconSvg}
          viewBox="0 0 11 14"
          role="presentation"
          focusable="false"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M0 0L11 7L0 14V0Z" fill="#76583D" />
        </svg>
      </div>
    </div>
  );
};

export default PlayArrowFilled;
