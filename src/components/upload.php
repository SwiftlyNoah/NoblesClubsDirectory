<?php
include("../config.php");

#ini_set('display_errors', 1);
#ini_set('display_startup_errors', 1);
#error_reporting(E_ALL);

$db = mysqli_connect(SQL_HOST,SQL_USERNAME,SQL_PWD,SQL_DATABASE);
$sql = $db -> prepare("SELECT available FROM dates WHERE date = ?");
$sql -> bind_param("s",$_POST["requested"]);
if ( ! $sql -> execute() ) {
  #echo $sql -> error;
  die("mysql_fail");
}
$result = $sql -> get_result();
$row = $result -> fetch_assoc();

if ( $row["available"] < $_POST["time"] || strtotime($_POST["requested"]) < time() ) {
  die("out_of_sync");
}

if ( $_FILES["media_file"]["name"] ) {
  $target_dir = "/var/www/html/dropbox/submitted_files/";
  $file_ext = strtolower(pathinfo(basename($_FILES["media_file"]["name"]),PATHINFO_EXTENSION));
  $fpath = "file_" . uniqid() . "." . $file_ext;
  $target_file = $target_dir . $fpath;

  move_uploaded_file($_FILES["media_file"]["tmp_name"], $target_file);
  $furl = "/submitted_files/" . $fpath;
} else {
  $furl = "";
}

#echo "here";

if ( $_POST["urgent"] == "on" ) $urgent = 1;
else $urgent = 0;

$sql = $db -> prepare("INSERT INTO submissions (submitted,requested,fname,lname,email,advisor_email,urgent,time,title,type,needs,recorded,media_url,notes) VALUES (now(),?,?,?,?,?,?,?,?,?,?,?,?,?)");
$recorded_str = "No";
if ( $_POST["recorded"] == "on" ) $recorded_str = "Yes";
$sql -> bind_param("sssssiissssss",$_POST["requested"],$_POST["fname"],$_POST["lname"],$_POST["email"],$_POST["advisor_email"],$urgent,$_POST["time"],$_POST["title"],$_POST["type"],$_POST["needs"],$recorded_str,$furl,$_POST["notes"]);
if ( ! $sql -> execute() ) {
  echo $sql -> error;
  die("mysql_fail");
}

$sql = $db -> prepare("UPDATE dates SET available = available - ?,requests = requests + 1,urgent = urgent + ? WHERE date = ?");
$sql -> bind_param("iis",$_POST["time"],$urgent,$_POST["requested"]);
if ( ! $sql -> execute() ) {
  die("mysql_fail");
}

mysqli_close($db);
echo "ok";
?>